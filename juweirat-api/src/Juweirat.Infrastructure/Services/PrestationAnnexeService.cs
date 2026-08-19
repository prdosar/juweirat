using Juweirat.Application.DTOs.Prestations;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class PrestationAnnexeService(AppDbContext db, AccountingService accountingService)
{
    public async Task<List<PrestationAnnexeDto>> GetAllAsync(bool activeOnly = false)
    {
        var q = db.PrestationsAnnexes.AsQueryable();
        if (activeOnly) q = q.Where(p => p.IsActive);
        var list = await q.OrderBy(p => p.SortOrder).ThenBy(p => p.Id).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<PrestationAnnexeDto?> GetByIdAsync(long id)
    {
        var p = await db.PrestationsAnnexes.FindAsync(id);
        return p is null ? null : ToDto(p);
    }

    public async Task<(PrestationAnnexeDto? dto, string? error)> CreateAsync(CreatePrestationRequest req)
    {
        var name = req.NameFr.Trim();
        var lower = name.ToLower();
        var exists = await db.PrestationsAnnexes.AnyAsync(p => p.NameFr.ToLower() == lower);
        if (exists) return (null, $"Une prestation nommée « {name} » existe déjà.");

        var p = new PrestationAnnexe
        {
            NameFr    = name,
            NameEn    = req.NameEn,
            Icon      = req.Icon,
            Mode      = req.Mode,
            PrixInclus = req.PrixInclus,
            PrixSeule  = req.PrixSeule,
            SortOrder  = req.SortOrder,
        };
        db.PrestationsAnnexes.Add(p);
        await db.SaveChangesAsync();

        try
        {
            await accountingService.EnsureAuxiliaryAccountAsync(
                AccountKind.Prestation, p.Id, $"Prestation — {p.NameFr}");
        }
        catch { /* silent */ }

        return (ToDto(p), null);
    }

    public async Task<(PrestationAnnexeDto? dto, string? error)> UpdateAsync(long id, UpdatePrestationRequest req)
    {
        var p = await db.PrestationsAnnexes.FindAsync(id);
        if (p is null) return (null, null);

        if (req.NameFr is not null)
        {
            var name = req.NameFr.Trim();
            var lower = name.ToLower();
            var conflict = await db.PrestationsAnnexes.AnyAsync(x => x.Id != id && x.NameFr.ToLower() == lower);
            if (conflict) return (null, $"Une prestation nommée « {name} » existe déjà.");
            p.NameFr = name;
        }
        if (req.NameEn is not null) p.NameEn = req.NameEn;
        if (req.Icon is not null)   p.Icon   = req.Icon;
        if (req.Mode is not null)   p.Mode   = req.Mode;
        if (req.PrixInclus is not null) p.PrixInclus = req.PrixInclus.Value;
        if (req.PrixSeule  is not null) p.PrixSeule  = req.PrixSeule.Value;
        if (req.IsActive   is not null) p.IsActive   = req.IsActive.Value;
        if (req.SortOrder  is not null) p.SortOrder  = req.SortOrder.Value;
        p.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return (ToDto(p), null);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var p = await db.PrestationsAnnexes.FindAsync(id);
        if (p is null) return false;
        db.PrestationsAnnexes.Remove(p);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<PrestationConsumptionDto>> GetConsumptionsAsync(long prestationId, DateOnly from, DateOnly to)
    {
        // Prestations rattachées à une réservation : la "date de consommation" est le check-in
        // (la prestation est facturée sur toute la durée du séjour à partir de cette date).
        // Bornes en UTC : Npgsql refuse les DateTime Kind=Unspecified pour timestamptz.
        var fromDt = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toDt   = to.ToDateTime(TimeOnly.MaxValue,   DateTimeKind.Utc);

        var fromReservations = await db.Set<ReservationPrestation>()
            .Include(rp => rp.Reservation).ThenInclude(r => r.Client)
            .Include(rp => rp.Reservation).ThenInclude(r => r.Room)
            .Where(rp => rp.PrestationId == prestationId)
            .Where(rp => rp.Reservation.CheckInDate <= to && rp.Reservation.CheckOutDate >= from)
            .Select(rp => new PrestationConsumptionDto(
                "Reservation",
                rp.Reservation.Id,
                rp.Reservation.Reference,
                rp.Reservation.CheckInDate,
                rp.Reservation.ClientId,
                rp.Reservation.Client.FullName,
                rp.Reservation.RoomId,
                rp.Reservation.Room != null ? rp.Reservation.Room.RoomNumber : null,
                rp.Reservation.Room != null ? rp.Reservation.Room.NameFr    : null,
                rp.Quantite,
                rp.PrixUnitaireSnapshot,
                rp.TotalLigne
            ))
            .ToListAsync();

        // Ventes directes : la date de consommation est CreatedAt.
        var fromDirectSales = await db.Set<VenteDirecte>()
            .Include(v => v.Client)
            .Include(v => v.Folio).ThenInclude(f => f!.Unit)
            .Where(v => v.PrestationId == prestationId)
            .Where(v => v.CreatedAt >= fromDt && v.CreatedAt <= toDt)
            .Select(v => new PrestationConsumptionDto(
                "VenteDirecte",
                v.Id,
                v.Folio != null ? v.Folio.Number : null,
                DateOnly.FromDateTime(v.CreatedAt),
                v.ClientId,
                v.Client != null ? v.Client.FullName : v.ClientNom,
                v.Folio != null ? (long?)v.Folio.UnitId : null,
                v.Folio != null ? v.Folio.Unit.RoomNumber : null,
                v.Folio != null ? v.Folio.Unit.NameFr    : null,
                v.Quantite,
                v.PrixUnitaireSnapshot,
                v.Total
            ))
            .ToListAsync();

        return fromReservations.Concat(fromDirectSales)
            .OrderByDescending(c => c.Date)
            .ToList();
    }

    private static PrestationAnnexeDto ToDto(PrestationAnnexe p) => new(
        p.Id, p.NameFr, p.NameEn, p.Icon, p.Mode,
        p.PrixInclus, p.PrixSeule, p.IsActive, p.SortOrder
    );
}
