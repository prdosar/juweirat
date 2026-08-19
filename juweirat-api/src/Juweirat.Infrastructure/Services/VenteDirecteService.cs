using Juweirat.Application.DTOs.Ventes;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class VenteDirecteService(AppDbContext db, AccountingService accountingService)
{
    public async Task<List<VenteDirecteDto>> GetAllAsync(DateOnly? date = null)
    {
        var q = db.VentesDirectes
            .Include(v => v.Prestation)
            .Include(v => v.Client)
            .Include(v => v.Folio).ThenInclude(f => f!.Unit)
            .AsQueryable();

        if (date is not null)
            q = q.Where(v => DateOnly.FromDateTime(v.CreatedAt.ToLocalTime()) == date.Value);

        var list = await q.OrderByDescending(v => v.CreatedAt).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<FolioActifDto?> GetFolioActifAsync(long clientId)
    {
        var resa = await db.Reservations
            .Where(r => r.ClientId == clientId && r.Status == ReservationStatus.CheckedIn)
            .Include(r => r.Folio).ThenInclude(f => f!.Unit)
            .Include(r => r.Room)
            .OrderByDescending(r => r.CheckInDate)
            .FirstOrDefaultAsync();

        if (resa?.Folio is null || resa.Folio.Closed) return null;

        var room = resa.Room ?? resa.Folio.Unit;
        return new FolioActifDto(
            resa.Folio.Id,
            resa.Folio.Number,
            room.RoomNumber,
            resa.Folio.Guest
        );
    }

    public async Task<(VenteDirecteDto? dto, string? error)> CreateAsync(CreateVenteDirecteRequest req)
    {
        var prestation = await db.PrestationsAnnexes.FindAsync(req.PrestationId);
        if (prestation is null || !prestation.IsActive)
            return (null, "Prestation introuvable ou inactive");

        var total = prestation.PrixSeule * req.Quantite;

        Folio? folio = null;
        if (req.Mode == "SurChambre")
        {
            if (req.FolioId is null)
                return (null, "FolioId requis pour le mode SurChambre");

            folio = await db.Folios
                .Include(f => f.Unit)
                .Include(f => f.Reservation)
                .FirstOrDefaultAsync(f => f.Id == req.FolioId.Value);
            if (folio is null)  return (null, "Folio introuvable");
            if (folio.Closed)   return (null, "Ce folio est déjà clôturé");
            if (!folio.CheckedIn) return (null, "Le client n'est pas encore enregistré sur ce folio");

            var config   = await db.HotelConfig.FindAsync(1);
            var dateHotel = config?.DateHotel ?? DateOnly.FromDateTime(DateTime.Today);

            db.Postings.Add(new Posting
            {
                DateHotel  = dateHotel,
                FolioId    = folio.Id,
                UnitId     = folio.UnitId,
                Famille    = "Prestation",
                Libelle    = $"{prestation.NameFr} × {req.Quantite}",
                Montant    = (int)Math.Round(total),
            });
        }

        var vente = new VenteDirecte
        {
            PrestationId         = req.PrestationId,
            ClientId             = req.ClientId,
            ClientNom            = req.ClientNom?.Trim(),
            FolioId              = folio?.Id,
            Quantite             = req.Quantite,
            PrixUnitaireSnapshot = prestation.PrixSeule,
            Total                = total,
            Mode                 = req.Mode,
            PaymentMethod        = req.PaymentMethod,
            Notes                = req.Notes?.Trim(),
            // TVA figée à la vente : SurChambre hérite du folio, sinon pas exonéré.
            TvaExonere           = folio?.TvaExonere ?? false,
        };

        db.VentesDirectes.Add(vente);
        await db.SaveChangesAsync();

        // Journal comptable — vente + éventuel encaissement immédiat.
        // Fire-and-forget non bloquant.
        try
        {
            // Client comptable : le client rattaché à la vente (via ID ou via le folio si SurChambre).
            long? clientForAccounting = vente.ClientId ?? folio?.Reservation?.ClientId;

            await accountingService.PostSaleAsync(
                clientId:          clientForAccounting,
                revenueKind:       AccountKind.Prestation,
                revenueOwnerRefId: vente.PrestationId,
                amountTtc:         vente.Total,
                tvaExonere:        vente.TvaExonere,
                sourceType:        "VenteDirecte",
                sourceId:          vente.Id,
                label:             $"{prestation.NameFr} × {vente.Quantite}");

            // Mode=Encaissement → l'argent rentre en caisse immédiatement.
            if (vente.Mode == "Encaissement")
            {
                await accountingService.PostEncaissementAsync(
                    clientId:   clientForAccounting,
                    amount:     vente.Total,
                    sourceType: "VenteDirecte",
                    sourceId:   vente.Id,
                    label:      $"Encaissement {prestation.NameFr} · {vente.PaymentMethod ?? "Espèces"}");
            }
        }
        catch { /* silent */ }

        var created = await db.VentesDirectes
            .Include(v => v.Prestation)
            .Include(v => v.Client)
            .Include(v => v.Folio).ThenInclude(f => f!.Unit)
            .FirstAsync(v => v.Id == vente.Id);

        return (ToDto(created), null);
    }

    private static VenteDirecteDto ToDto(VenteDirecte v)
    {
        var clientLabel = v.Client?.FullName ?? v.ClientNom;
        return new(
            v.Id,
            v.PrestationId,
            v.Prestation.NameFr,
            v.Prestation.Icon,
            v.ClientId,
            clientLabel,
            v.FolioId,
            v.Folio?.Number,
            v.Folio?.Unit?.RoomNumber,
            v.Quantite,
            v.PrixUnitaireSnapshot,
            v.Total,
            v.Mode,
            v.PaymentMethod,
            v.Notes,
            v.CreatedAt,
            v.TvaExonere
        );
    }
}
