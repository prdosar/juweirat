using Juweirat.Application.DTOs.Folios;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class FolioService(AppDbContext db)
{
    private FolioDto ToDto(Folio f)
    {
        var nights = Math.Max(0, f.Departure.DayNumber - f.Arrival.DayNumber);
        var heb = f.Heb > 0 ? f.Heb : f.Rate * nights;
        var pdjTot = f.PdjParJour * f.PdjPrix * nights;
        var total = heb + pdjTot + f.Debiteur + f.Dependances;
        var brut = f.Paid + f.Arrhes;
        var solde = Math.Max(0, total - brut);

        return new FolioDto(
            Id: f.Id,
            Number: f.Number,
            UnitId: f.UnitId,
            Guest: f.Guest,
            Nom: f.Nom,
            Prenom: f.Prenom,
            Societe: f.Societe,
            Reservataire: f.Reservataire,
            Segment: f.Segment.ToString(),
            Pax: f.Pax,
            Arrival: f.Arrival,
            Departure: f.Departure,
            Rate: f.Rate,
            Heb: f.Heb,
            TarifTier: f.TarifTier.ToString(),
            ElecIncluded: f.ElecIncluded,
            PdjParJour: f.PdjParJour,
            PdjPrix: f.PdjPrix,
            Debiteur: f.Debiteur,
            Dependances: f.Dependances,
            Arrhes: f.Arrhes,
            Paid: f.Paid,
            PayMode: f.PayMode,
            FactRecipient: f.FactRecipient,
            ResaStatus: f.ResaStatus.ToString(),
            CheckedIn: f.CheckedIn,
            Closed: f.Closed,
            CheckoutDate: f.CheckoutDate,
            Note: f.Note,
            FactureId: f.FactureId,
            ReservationId: f.ReservationId,
            Total: total,
            Solde: solde,
            Nights: nights,
            PdjTot: pdjTot,
            Avoir: Math.Max(0, brut - total),
            Encaisse: Math.Min(brut, total)
        );
    }

    public async Task<List<FolioDto>> GetAllAsync()
    {
        var folios = await db.Folios.OrderByDescending(f => f.CreatedAt).ToListAsync();
        return folios.Select(ToDto).ToList();
    }

    public async Task<FolioDto?> GetByIdAsync(long id)
    {
        var f = await db.Folios.FirstOrDefaultAsync(x => x.Id == id);
        return f is null ? null : ToDto(f);
    }

    private async Task<bool> IsOverlappingAsync(long unitId, DateOnly arrival, DateOnly departure, long? excludeId = null)
    {
        var query = db.Folios.Where(f => f.UnitId == unitId 
            && f.ResaStatus != FolioResaStatus.Annulee 
            && f.ResaStatus != FolioResaStatus.NoShow 
            && f.Arrival < departure 
            && f.Departure > arrival);

        if (excludeId.HasValue)
            query = query.Where(f => f.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<(FolioDto? dto, string? error)> CreateAsync(CreateFolioRequest req)
    {
        if (await IsOverlappingAsync(req.UnitId, req.Arrival, req.Departure))
            return (null, "Le logement est déjà réservé sur cette période (Surréservation).");

        var nextId = (await db.Folios.MaxAsync(f => (long?)f.Id) ?? 0) + 1;
        var f = new Folio
        {
            Number = $"FL-{DateTime.UtcNow.Year}-{nextId:D4}",
            UnitId = req.UnitId,
            Arrival = req.Arrival,
            Departure = req.Departure,
            Guest = req.Guest,
            Nom = req.Nom,
            Prenom = req.Prenom,
            Societe = req.Societe,
            Rate = req.Rate,
            Pax = req.Pax,
            Segment = Enum.TryParse<FolioSegment>(req.Segment, true, out var s) ? s : FolioSegment.Direct,
            ResaStatus = Enum.TryParse<FolioResaStatus>(req.ResaStatus, true, out var r) ? r : FolioResaStatus.Confirmee
        };
        db.Folios.Add(f);
        await db.SaveChangesAsync();
        return (ToDto(f), null);
    }

    public async Task<(FolioDto? dto, string? error)> UpdateAsync(long id, UpdateFolioRequest req)
    {
        var f = await db.Folios.FirstOrDefaultAsync(x => x.Id == id);
        if (f is null) return (null, "Folio not found");

        if (req.UnitId != f.UnitId || req.Arrival != f.Arrival || req.Departure != f.Departure)
        {
            if (await IsOverlappingAsync(req.UnitId, req.Arrival, req.Departure, id))
                return (null, "Modification impossible : conflit de dates avec une autre réservation.");
        }

        if (req.CheckedIn && !f.CheckedIn)
        {
            var room = await db.Rooms.FindAsync(req.UnitId);
            if (room == null || room.StatutMenage != MenageStatus.Propre || room.Status == RoomStatus.Maintenance)
                return (null, "Impossible de faire le check-in : le logement n'est pas propre ou est en maintenance.");
        }

        if (req.Closed && !f.Closed)
        {
            var room = await db.Rooms.FindAsync(req.UnitId);
            if (room != null) room.StatutMenage = MenageStatus.Sale; // Automatisation ménage
        }

        f.UnitId = req.UnitId;
        f.Arrival = req.Arrival;
        f.Departure = req.Departure;
        f.Guest = req.Guest;
        f.Nom = req.Nom;
        f.Prenom = req.Prenom;
        f.Societe = req.Societe;
        f.Reservataire = req.Reservataire;
        if (Enum.TryParse<FolioSegment>(req.Segment, true, out var seg)) f.Segment = seg;
        f.Pax = req.Pax;
        f.Rate = req.Rate;
        f.Heb = req.Heb;
        if (Enum.TryParse<TarifTier>(req.TarifTier, true, out var tier)) f.TarifTier = tier;
        f.ElecIncluded = req.ElecIncluded;
        f.PdjParJour = req.PdjParJour;
        f.PdjPrix = req.PdjPrix;
        f.Debiteur = req.Debiteur;
        f.Dependances = req.Dependances;
        f.Arrhes = req.Arrhes;
        f.Paid = req.Paid;
        f.PayMode = req.PayMode;
        f.FactRecipient = req.FactRecipient;
        if (Enum.TryParse<FolioResaStatus>(req.ResaStatus, true, out var stat)) f.ResaStatus = stat;
        f.CheckedIn = req.CheckedIn;
        f.Closed = req.Closed;
        f.CheckoutDate = req.CheckoutDate;
        f.Note = req.Note;
        f.FactureId = req.FactureId;
        f.ReservationId = req.ReservationId;

        await db.SaveChangesAsync();
        return (ToDto(f), null);
    }
}
