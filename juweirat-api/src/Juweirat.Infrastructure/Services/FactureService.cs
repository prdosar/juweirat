using Juweirat.Application.DTOs.Pms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class FactureService(AppDbContext db, AccountingService accountingService)
{
    // ── List / Get ────────────────────────────────────────────────────────────

    public async Task<List<FactureDto>> GetAllAsync(string? search = null, DateOnly? from = null, DateOnly? to = null)
    {
        var query = db.Factures.Include(f => f.Folio).AsQueryable();

        if (from.HasValue) query = query.Where(f => f.Date >= from.Value);
        if (to.HasValue)   query = query.Where(f => f.Date <= to.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(f =>
                (f.Folio.Guest != null     && EF.Functions.ILike(f.Folio.Guest,    $"%{s}%")) ||
                (f.Folio.Nom != null       && EF.Functions.ILike(f.Folio.Nom,      $"%{s}%")) ||
                (f.Folio.Prenom != null    && EF.Functions.ILike(f.Folio.Prenom,   $"%{s}%")) ||
                (f.Folio.Societe != null   && EF.Functions.ILike(f.Folio.Societe,  $"%{s}%")) ||
                EF.Functions.ILike(f.Number, $"%{s}%"));
        }

        var factures = await query.OrderByDescending(f => f.Date).ThenByDescending(f => f.CreatedAt).ToListAsync();
        return factures.Select(ToDto).ToList();
    }

    public async Task<FactureDto?> GetByIdAsync(long id)
    {
        var f = await db.Factures.Include(f => f.Folio).FirstOrDefaultAsync(x => x.Id == id);
        return f is null ? null : ToDto(f);
    }

    // ── Émettre (depuis un folio) ─────────────────────────────────────────────

    public async Task<(FactureDto? dto, string? error)> EmettreAsync(long folioId)
    {
        var folio = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation).ThenInclude(r => r!.Prestations)
            .FirstOrDefaultAsync(f => f.Id == folioId);
        if (folio is null) return (null, null);

        var existingActive = await db.Factures.AnyAsync(f => f.FolioId == folioId && f.Status == FactureStatus.Emise);
        if (existingActive)
            return (null, "Ce folio a déjà une facture émise. Annulez-la ou rectifiez-la.");

        var config = await db.HotelConfig.FindAsync(1)
            ?? throw new InvalidOperationException("HotelConfig introuvable");

        config.FactureSeq++;
        var number = $"FAC-{config.DateHotel.Year}-{config.FactureSeq:D4}";

        var snapshot = BuildSnapshot(folio);

        var facture = new Facture
        {
            Number   = number,
            FolioId  = folio.Id,
            Date     = config.DateHotel,
            Status   = FactureStatus.Emise,
            Snapshot = snapshot,
        };

        db.Factures.Add(facture);
        await db.SaveChangesAsync();

        // Maintain denormalized FactureId on Folio
        folio.FactureId = facture.Id;
        await db.SaveChangesAsync();

        // Journal comptable — vente hébergement HT + TVA au compte client.
        // Fire-and-forget non bloquant.
        try
        {
            var clientId = folio.Reservation?.ClientId;
            // On envoie le HT (snapshot.TotalHt) : PostSaleAsync ajoute la TVA
            // sur le compte TvaCollected et le TTC sur le compte client.
            var htToPost = snapshot.TotalHt ?? 0;
            if (clientId is not null && htToPost > 0)
            {
                await accountingService.PostSaleAsync(
                    clientId:          clientId,
                    revenueKind:       AccountKind.RevenueHebergement,
                    revenueOwnerRefId: null,
                    amountHt:          htToPost,
                    tvaExonere:        folio.TvaExonere,
                    sourceType:        "Facture",
                    sourceId:          facture.Id,
                    label:             $"Facture {facture.Number} · {snapshot.UnitLabel ?? folio.Unit?.RoomNumber}");
            }
        }
        catch { /* silent */ }

        var created = await db.Factures.Include(f => f.Folio).FirstAsync(f => f.Id == facture.Id);
        return (ToDto(created), null);
    }

    // ── Annuler ───────────────────────────────────────────────────────────────

    public async Task<(FactureDto? dto, string? error)> AnnulerAsync(long id)
    {
        var facture = await db.Factures.Include(f => f.Folio).FirstOrDefaultAsync(f => f.Id == id);
        if (facture is null) return (null, null);
        if (facture.Status == FactureStatus.Annulee) return (null, "Facture déjà annulée");

        facture.Status = FactureStatus.Annulee;

        // Libérer le folio pour ré-émission
        if (facture.Folio is not null)
            facture.Folio.FactureId = null;

        await db.SaveChangesAsync();
        return (ToDto(facture), null);
    }

    // ── Rectifier ─────────────────────────────────────────────────────────────
    // Même numéro, corrections++, snapshot mis à jour.

    public async Task<(FactureDto? dto, string? error)> RectifierAsync(long id, RectifierRequest req)
    {
        var facture = await db.Factures.Include(f => f.Folio).FirstOrDefaultAsync(f => f.Id == id);
        if (facture is null) return (null, null);
        if (facture.Status == FactureStatus.Annulee) return (null, "Impossible de rectifier une facture annulée");

        facture.Corrections++;
        facture.CorrigeeLe = DateOnly.FromDateTime(DateTime.UtcNow);

        if (facture.Snapshot is not null)
        {
            if (req.Lines is not null)
            {
                facture.Snapshot.Lines = req.Lines
                    .Select(l => new FactureSnapshotLine { Label = l.Label, Montant = l.Montant })
                    .ToList();
                facture.Snapshot.Total = req.Lines.Sum(l => l.Montant);
            }
            if (req.PayMode   is not null) facture.Snapshot.PayMode   = req.PayMode;
            if (req.Recipient is not null) facture.Snapshot.Recipient = req.Recipient;
        }

        await db.SaveChangesAsync();
        return (ToDto(facture), null);
    }

    // ── Incrémenter printCount ─────────────────────────────────────────────────

    public async Task<FactureDto?> IncrementPrintAsync(long id)
    {
        var facture = await db.Factures.Include(f => f.Folio).FirstOrDefaultAsync(f => f.Id == id);
        if (facture is null) return null;

        facture.PrintCount++;
        await db.SaveChangesAsync();
        return ToDto(facture);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Taux TVA unique appliqué au Togo (hôtellerie standard) — configurable dans une v2.
    private const decimal TVA_RATE = 0.18m;

    private static FactureSnapshot BuildSnapshot(Folio folio)
    {
        var nights         = folio.Departure.DayNumber - folio.Arrival.DayNumber;
        // Source unique de vérité prix : Reservation liée si elle existe.
        var (hebGross, discount, hebNet, _) = PmsService.ResolveHeb(folio, nights);
        var totalPdj       = folio.PdjParJour * folio.PdjPrix * nights;
        var totalDep       = folio.Dependances;
        var totalDeb       = folio.Debiteur;
        var total          = hebNet + totalPdj + totalDep + totalDeb;

        // Décomposition HT/TVA/TTC — les prix stockés (heb net, PdjPrix, Dép, Déb)
        // sont HT ; la TVA est ajoutée sur le total.
        int totalHt  = total;
        int tva      = folio.TvaExonere ? 0 : (int)Math.Round(totalHt * TVA_RATE, 0);
        int totalTtc = totalHt + tva;

        var elecMention = folio.ElecIncluded ? "" : " (hors électricité)";
        var tierLabel   = folio.TarifTier switch
        {
            TarifTier.N15Nuits => "forfait 15 nuits",
            TarifTier.N30Nuits => "forfait 30 nuits",
            _                  => "nuitée",
        };

        var lines = new List<FactureSnapshotLine>
        {
            new()
            {
                Label   = $"Hébergement {folio.Unit?.PmsType} {folio.Unit?.PmsGamme}" +
                          $" — {tierLabel} × {nights} nuit(s){elecMention}",
                Montant = hebGross,
            },
        };

        if (discount > 0)
            lines.Add(new() { Label = "Remise contractuelle", Montant = -discount });
        if (totalPdj > 0)
            lines.Add(new() { Label = $"Petit-déjeuner × {nights} j (× {folio.PdjParJour}/j)", Montant = totalPdj });
        if (totalDep > 0)
            lines.Add(new() { Label = "Dépendances", Montant = totalDep });
        if (totalDeb > 0)
            lines.Add(new() { Label = "Débiteur divers", Montant = totalDeb });

        return new FactureSnapshot
        {
            Lines        = lines,
            Total        = totalTtc,
            Arrhes       = folio.Arrhes,
            Paid         = folio.Paid,
            PayMode      = folio.PayMode,
            Recipient    = folio.FactRecipient,
            Client       = folio.Guest,
            Societe      = folio.Societe,
            Reservataire = folio.Reservataire,
            UnitLabel    = folio.Unit?.NameFr ?? folio.UnitId.ToString(),
            Arrival      = folio.Arrival,
            Departure    = folio.Departure,
            Nights       = nights,
            Pax          = folio.Pax,
            TvaExonere   = folio.TvaExonere,
            TotalHt      = totalHt,
            Tva          = tva,
            TotalTtc     = totalTtc,
            TvaRate      = folio.TvaExonere ? null : TVA_RATE,
        };
    }

    private static FactureDto ToDto(Facture f) => new(
        f.Id, f.Number,
        f.FolioId, f.Folio?.Number ?? string.Empty,
        f.Date, f.Status.ToString(),
        f.PrintCount, f.Corrections, f.CorrigeeLe,
        f.Snapshot is null ? null : new FactureSnapshotDto(
            f.Snapshot.Lines.Select(l => new FactureLineDto(l.Label, l.Montant)).ToList(),
            f.Snapshot.Total, f.Snapshot.Arrhes, f.Snapshot.Paid,
            f.Snapshot.PayMode, f.Snapshot.Recipient,
            f.Snapshot.Client, f.Snapshot.Societe, f.Snapshot.Reservataire,
            f.Snapshot.UnitLabel, f.Snapshot.Arrival, f.Snapshot.Departure,
            f.Snapshot.Nights, f.Snapshot.Pax,
            f.Snapshot.TvaExonere, f.Snapshot.TotalHt, f.Snapshot.Tva, f.Snapshot.TotalTtc, f.Snapshot.TvaRate
        ),
        f.CreatedAt, f.UpdatedAt
    );
}
