using Juweirat.Application.DTOs.Pms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class ClotureService(AppDbContext db)
{
    // ── Preview ───────────────────────────────────────────────────────────────
    // Returns what's pending before the clôture can be executed.

    public async Task<CloturePreviewDto?> GetPreviewAsync()
    {
        var config = await db.HotelConfig.FindAsync(1);
        if (config is null) return null;

        var dateHotel = config.DateHotel;

        // Self-heal : synchronise folio.ResaStatus quand la résa parente est
        // Cancelled/NoShow mais que le folio n'a pas été mis à jour (code
        // antérieur, ou chemin d'annulation qui n'a pas propagé).
        var stale = await db.Folios
            .Include(f => f.Reservation)
            .Where(f =>
                f.Arrival == dateHotel &&
                !f.CheckedIn &&
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                f.Reservation != null &&
                (f.Reservation.Status == ReservationStatus.Cancelled ||
                 f.Reservation.Status == ReservationStatus.NoShow))
            .ToListAsync();
        if (stale.Count > 0)
        {
            foreach (var f in stale)
            {
                f.ResaStatus = f.Reservation!.Status == ReservationStatus.NoShow
                    ? FolioStatus.NoShow
                    : FolioStatus.Annulee;
            }
            await db.SaveChangesAsync();
        }

        // Whitelist stricte : on n'affiche QUE les folios rattachés à une résa
        // effectivement en attente d'arrivée (Pending ou Confirmed). Toute résa
        // Cancelled, NoShow, CheckedIn ou CheckedOut est exclue, quel que soit
        // l'état de folio.ResaStatus (qui peut avoir drift historiquement).
        var pendingArrivals = await db.Folios
            .Include(f => f.Unit)
            .Include(f => f.Reservation)
            .Where(f =>
                f.Arrival == dateHotel &&
                !f.CheckedIn &&
                f.Reservation != null &&
                (f.Reservation.Status == ReservationStatus.Pending ||
                 f.Reservation.Status == ReservationStatus.Confirmed))
            .Select(f => new FolioPendingItemDto(f.Id, f.Number, f.Guest, f.Unit.NameFr, f.Arrival, f.ReservationId))
            .ToListAsync();

        var pendingDepartures = await db.Folios
            .Include(f => f.Unit)
            .Where(f =>
                f.Departure == dateHotel &&
                f.CheckedIn &&
                !f.Closed)
            .Select(f => new FolioPendingItemDto(f.Id, f.Number, f.Guest, f.Unit.NameFr, f.Departure, f.ReservationId))
            .ToListAsync();

        var activeCount = await db.Folios.CountAsync(f =>
            f.CheckedIn && !f.Closed &&
            f.ResaStatus != FolioStatus.Annulee &&
            f.ResaStatus != FolioStatus.NoShow &&
            f.Arrival <= dateHotel && f.Departure > dateHotel);

        return new CloturePreviewDto(
            dateHotel,
            pendingArrivals,
            pendingDepartures,
            activeCount,
            pendingArrivals.Count == 0 && pendingDepartures.Count == 0
        );
    }

    // ── Execute ───────────────────────────────────────────────────────────────
    // Atomic daily closing: postings → indicators → advance dateHotel.

    public async Task<(ClotureDto? dto, string? error)> ExecuteAsync()
    {
        var config = await db.HotelConfig.FindAsync(1);
        if (config is null) return (null, "HotelConfig introuvable");

        var dateHotel = config.DateHotel;

        // Non-rejouable (rule 9)
        if (await db.Clotures.AnyAsync(c => c.DateHotel == dateHotel))
            return (null, $"La date {dateHotel:yyyy-MM-dd} a déjà été clôturée");

        // Même whitelist stricte qu'en preview : seule une résa Pending/Confirmed
        // peut bloquer la clôture. Le reste est ignoré.
        var pendingArrivals = await db.Folios.CountAsync(f =>
            f.Arrival == dateHotel &&
            !f.CheckedIn &&
            f.Reservation != null &&
            (f.Reservation.Status == ReservationStatus.Pending ||
             f.Reservation.Status == ReservationStatus.Confirmed));

        if (pendingArrivals > 0)
            return (null, $"{pendingArrivals} arrivée(s) non traitée(s). Effectuez le check-in ou marquez en no-show avant de clôturer.");

        var pendingDepartures = await db.Folios.CountAsync(f =>
            f.Departure == dateHotel &&
            f.CheckedIn &&
            !f.Closed);

        if (pendingDepartures > 0)
            return (null, $"{pendingDepartures} départ(s) non traité(s). Effectuez le check-out ou prolongez le séjour avant de clôturer.");

        // Active folios in-house on dateHotel
        var activeFolios = await db.Folios
            .Include(f => f.Unit)
            .Where(f =>
                f.CheckedIn && !f.Closed &&
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                f.Arrival <= dateHotel && f.Departure > dateHotel)
            .ToListAsync();

        // Passage des prix — generate postings (main courante)
        var postings = new List<Posting>();
        foreach (var folio in activeFolios)
        {
            postings.Add(new Posting
            {
                DateHotel   = dateHotel,
                FolioId     = folio.Id,
                UnitId      = folio.UnitId,
                Libelle     = $"Hébergement {folio.Unit?.PmsRoomNo ?? folio.Unit?.RoomNumber} — {folio.Rate:N0} FCFA/nuit",
                Montant     = folio.Rate,
                Horodatage  = DateTime.UtcNow,
            });

            if (folio.PdjParJour > 0)
            {
                var pdjMontant = folio.PdjParJour * folio.PdjPrix;
                postings.Add(new Posting
                {
                    DateHotel   = dateHotel,
                    FolioId     = folio.Id,
                    UnitId      = folio.UnitId,
                    Famille     = "Petit-déjeuner",
                    Libelle     = $"PDJ × {folio.PdjParJour} — {folio.PdjPrix:N0} FCFA/pers",
                    Montant     = pdjMontant,
                    Horodatage  = DateTime.UtcNow,
                });
            }
        }

        // Indicators
        var totalUnits = await db.Rooms.CountAsync(r => !r.HorsService);
        var dispo      = totalUnits;
        var occ        = activeFolios.Count;
        var caHeb      = activeFolios.Sum(f => f.Rate);
        var caPdj      = activeFolios.Sum(f => f.PdjParJour * f.PdjPrix);
        var caTotal    = caHeb + caPdj;
        var occupation = dispo > 0 ? Math.Round((decimal)occ / dispo * 100, 2) : 0m;
        var pm         = occ   > 0 ? caHeb / occ   : 0;
        var revpar     = dispo > 0 ? caHeb / dispo  : 0;

        var nbArrivals = await db.Folios.CountAsync(f => f.Arrival == dateHotel && f.CheckedIn);
        var nbDeparts  = await db.Folios.CountAsync(f => f.CheckoutDate == dateHotel && f.Closed);
        var nbNoShow   = await db.Folios.CountAsync(f => f.Arrival == dateHotel && f.ResaStatus == FolioStatus.NoShow);

        // Create Cloture record
        var cloture = new Cloture
        {
            DateHotel  = dateHotel,
            ExecutedAt = DateTime.UtcNow,
            Dispo      = dispo,
            Occ        = occ,
            Occupation = occupation,
            CaHeb      = caHeb,
            CaPdj      = caPdj,
            CaTotal    = caTotal,
            Pm         = pm,
            RevPar     = revpar,
            NbArrivals = nbArrivals,
            NbDeparts  = nbDeparts,
            NbNoShow   = nbNoShow,
            NbLignes   = postings.Count,
            Montant    = postings.Sum(p => p.Montant),
        };

        // Advance dateHotel (atomic with all the above)
        config.DateHotel = dateHotel.AddDays(1);

        await using var tx = await db.Database.BeginTransactionAsync();
        db.Postings.AddRange(postings);
        db.Clotures.Add(cloture);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return (ToDto(cloture), null);
    }

    // ── History ───────────────────────────────────────────────────────────────

    public async Task<List<ClotureDto>> GetHistoryAsync(int limit = 90)
    {
        var clotures = await db.Clotures
            .OrderByDescending(c => c.DateHotel)
            .Take(limit)
            .ToListAsync();

        return clotures.Select(ToDto).ToList();
    }

    public async Task<ClotureDto?> GetByDateAsync(DateOnly date)
    {
        var c = await db.Clotures.FirstOrDefaultAsync(x => x.DateHotel == date);
        return c is null ? null : ToDto(c);
    }

    // ── Postings ──────────────────────────────────────────────────────────────

    public async Task<List<PostingDto>> GetPostingsAsync(DateOnly? date = null, long? folioId = null)
    {
        var query = db.Postings.AsQueryable();
        if (date.HasValue)    query = query.Where(p => p.DateHotel == date.Value);
        if (folioId.HasValue) query = query.Where(p => p.FolioId == folioId.Value);

        return await query
            .OrderByDescending(p => p.DateHotel).ThenBy(p => p.Horodatage)
            .Select(p => new PostingDto(p.Id, p.DateHotel, p.FolioId, p.UnitId, p.Famille, p.Libelle, p.Montant, p.Horodatage))
            .ToListAsync();
    }

    private static ClotureDto ToDto(Cloture c) => new(
        c.Id, c.DateHotel, c.ExecutedAt,
        c.Dispo, c.Occ, c.Occupation,
        c.CaHeb, c.CaPdj, c.CaTotal,
        c.Pm, c.RevPar,
        c.NbArrivals, c.NbDeparts, c.NbNoShow,
        c.NbLignes, c.Montant
    );
}

public record PostingDto(
    long Id, DateOnly DateHotel, long FolioId, long UnitId,
    string Famille, string Libelle, int Montant, DateTime Horodatage
);
