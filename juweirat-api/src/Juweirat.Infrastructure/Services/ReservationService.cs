using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Prestations;
using Juweirat.Application.DTOs.Reservations;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class ReservationService(AppDbContext db)
{
    public async Task<PagedResult<ReservationDto>> GetPagedAsync(ReservationFilterParams filter)
    {
        var query = db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(r =>
                r.Reference.ToLower().Contains(search) ||
                r.Client.FirstName.ToLower().Contains(search) ||
                r.Client.LastName.ToLower().Contains(search) ||
                (r.Client.Email != null && r.Client.Email.ToLower().Contains(search)) ||
                (r.Client.Phone != null && r.Client.Phone.Contains(search)) ||
                (r.Room != null && r.Room.RoomNumber.ToLower().Contains(search)) ||
                (r.Room != null && r.Room.NameFr.ToLower().Contains(search)) ||
                (r.Category != null && r.Category.NameFr.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<ReservationStatus>(filter.Status, true, out var st))
        {
            query = query.Where(r => r.Status == st);
        }

        if (filter.CategoryId.HasValue)
            query = query.Where(r => r.CategoryId == filter.CategoryId.Value);

        if (filter.RoomId.HasValue)
            query = query.Where(r => r.RoomId == filter.RoomId.Value);

        if (filter.ClientId.HasValue)
            query = query.Where(r => r.ClientId == filter.ClientId.Value);

        if (filter.StartDate.HasValue)
            query = query.Where(r => r.CheckInDate >= filter.StartDate.Value);

        if (filter.EndDate.HasValue)
            query = query.Where(r => r.CheckInDate <= filter.EndDate.Value);

        if (!string.IsNullOrWhiteSpace(filter.Source))
            query = query.Where(r => r.Source != null && r.Source.ToLower() == filter.Source.ToLower());

        if (!string.IsNullOrWhiteSpace(filter.PaymentStatus))
        {
            var payStatus = filter.PaymentStatus.ToLower();
            if (payStatus == "paid")
                query = query.Where(r => r.Payments.Sum(p => p.Amount) >= r.TotalPrice);
            else if (payStatus == "partial")
                query = query.Where(r => r.Payments.Sum(p => p.Amount) > 0 && r.Payments.Sum(p => p.Amount) < r.TotalPrice);
            else if (payStatus == "unpaid")
                query = query.Where(r => !r.Payments.Any() || r.Payments.Sum(p => p.Amount) == 0);
        }

        if (string.IsNullOrWhiteSpace(filter.SortBy))
        {
            query = query.OrderByDescending(r => r.CreatedAt);
        }

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<List<ReservationDto>> GetAllAsync(string? status = null)
    {
        var query = db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .AsQueryable();

        if (status is not null && Enum.TryParse<ReservationStatus>(status, true, out var s))
            query = query.Where(r => r.Status == s);

        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<ReservationDto?> GetByIdAsync(long id)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : ToDto(r);
    }

    public async Task<(ReservationDto? dto, string? error)> CreateAsync(CreateReservationRequest req)
    {
        if (req.CheckOutDate <= req.CheckInDate)
            return (null, "checkOutDate must be after checkInDate");

        Room? room = null;
        if (req.RoomId is not null)
        {
            room = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == req.RoomId.Value);
            if (room is null) return (null, "Room not found");
            if (room.Status != RoomStatus.Available) return (null, "Room is not available");

            var overlap = await CheckOverlapAsync(req.RoomId.Value, req.CheckInDate, req.CheckOutDate);
            if (overlap) return (null, "Room is already reserved for these dates");
        }

        var category = (req.CategoryId > 0 ? await db.RoomCategories.FindAsync(req.CategoryId) : null)
                       ?? (room?.CategoryId != null ? await db.RoomCategories.FindAsync(room.CategoryId.Value) : null)
                       ?? (room != null ? await db.RoomCategories.FirstOrDefaultAsync(c => c.PmsType == room.PmsType) : null)
                       ?? await db.RoomCategories.FirstOrDefaultAsync();

        if (category is null) return (null, "Category not found");

        var nights = req.CheckOutDate.DayNumber - req.CheckInDate.DayNumber;

        if (room is null && req.CategoryId > 0)
        {
            // Auto-assign: find first available room in the category
            var candidateIds = await db.Rooms
                .Where(r => r.CategoryId == req.CategoryId && r.Status == RoomStatus.Available)
                .Select(r => r.Id)
                .ToListAsync();

            foreach (var candidateId in candidateIds)
            {
                if (!await CheckOverlapAsync(candidateId, req.CheckInDate, req.CheckOutDate))
                {
                    room = await db.Rooms.Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == candidateId);
                    break;
                }
            }
        }

        // Tarification selon le palier — priorité : tarif compagnie > tarif catégorie > tarif chambre
        var client = await db.Clients.FindAsync(req.ClientId);
        CompanyTarif? companyTarif = null;
        if (client?.CompanyId is not null)
        {
            companyTarif = await db.CompanyTarifs.FirstOrDefaultAsync(
                t => t.CompanyId == client.CompanyId && t.CategoryId == category.Id);
        }

        var tarifNuit = companyTarif?.TarifNuit > 0 ? companyTarif.TarifNuit
                      : (category.TarifNuit > 0 ? category.TarifNuit : (room != null ? room.TarifNuit : 30000));
        var tarifN15  = companyTarif?.TarifN15 > 0 ? companyTarif.TarifN15
                      : (category.TarifN15 > 0 ? category.TarifN15 : (room != null ? room.TarifN15 : 200000));
        var tarifN30  = companyTarif?.TarifN30 > 0 ? companyTarif.TarifN30
                      : (category.TarifN30 > 0 ? category.TarifN30 : (room != null ? room.TarifN30 : 300000));

        var tarifResult   = TarifEngine.ForStay(tarifNuit, tarifN15, tarifN30, nights);
        var totalHeb      = (decimal)tarifResult.PerNight * nights;

        // Résoudre les prestations demandées
        var lignesPrestations = new List<ReservationPrestation>();
        decimal totalPrestations = 0;
        if (req.Prestations is { Count: > 0 })
        {
            var ids = req.Prestations.Select(p => p.PrestationId).Distinct().ToList();
            var catalogue = await db.PrestationsAnnexes
                .Where(p => ids.Contains(p.Id) && p.IsActive)
                .ToDictionaryAsync(p => p.Id);

            foreach (var ligne in req.Prestations)
            {
                if (!catalogue.TryGetValue(ligne.PrestationId, out var prestation)) continue;
                var ligneTotal = prestation.PrixInclus * ligne.Quantite;
                lignesPrestations.Add(new ReservationPrestation
                {
                    PrestationId           = prestation.Id,
                    Quantite               = ligne.Quantite,
                    PrixUnitaireSnapshot   = prestation.PrixInclus,
                    TotalLigne             = ligneTotal,
                });
                totalPrestations += ligneTotal;
            }
        }

        var total = totalHeb + totalPrestations;

        var reservation = new Reservation
        {
            Reference             = await GenerateReferenceAsync(),
            CategoryId            = category.Id,
            RoomId                = room?.Id,
            ClientId              = req.ClientId,
            CheckInDate           = req.CheckInDate,
            CheckOutDate          = req.CheckOutDate,
            Nights                = nights,
            Adults                = req.Adults,
            Children              = req.Children,
            PricePerNightSnapshot = tarifResult.PerNight,
            TotalPrice            = total,
            Currency              = req.Currency,
            Source                = req.Source,
            SpecialRequests       = req.SpecialRequests,
            InternalNotes         = req.InternalNotes,
            GarantieType          = req.GarantieType,
            GarantieMontantCash   = req.GarantieMontantCash,
            CarteNom              = req.CarteNom,
            CarteSuffix           = req.CarteSuffix,
            CarteExpiration       = req.CarteExpiration,
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();

        foreach (var ligne in lignesPrestations)
        {
            ligne.ReservationId = reservation.Id;
            db.ReservationPrestations.Add(ligne);
        }
        if (lignesPrestations.Count > 0)
            await db.SaveChangesAsync();

        var created = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(r => r.Id == reservation.Id);

        return (ToDto(created), null);
    }

    public async Task<(ReservationDto? dto, string? error)> UpdateStatusAsync(long id, UpdateReservationStatusRequest req)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Reservation not found");

        if (!Enum.TryParse<ReservationStatus>(req.Status, true, out var newStatus))
            return (null, $"Invalid status: {req.Status}");

        r.Status = newStatus;
        if (req.InternalNotes is not null) r.InternalNotes = req.InternalNotes;

        switch (newStatus)
        {
            case ReservationStatus.Confirmed:
                r.ConfirmedAt = DateTime.UtcNow;
                if (r.Folio is null)
                    await CreateFolioFromReservationAsync(r);
                break;
            case ReservationStatus.Cancelled:
                r.CancelledAt        = DateTime.UtcNow;
                r.CancellationReason = req.CancellationReason;
                break;
        }

        await db.SaveChangesAsync();
        return (ToDto(r), null);
    }

    public async Task<(NoShowBillingResultDto? dto, string? error)> ProcessNoShowAsync(long id)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r is null) return (null, "Réservation introuvable");
        if (r.Status != ReservationStatus.NoShow) return (null, "Cette réservation n'est pas en statut No Show");

        var alreadyBilled = r.Payments.Any(p => p.Notes != null && p.Notes.StartsWith("Retenue No Show"));
        if (alreadyBilled) return (null, "Une retenue No Show a déjà été appliquée");

        var penaltyNights = r.Nights < 15 ? 1 : r.Nights < 30 ? 2 : 4;
        var penaltyAmount = penaltyNights * r.PricePerNightSnapshot;

        db.Payments.Add(new Payment
        {
            ReservationId = r.Id,
            Amount        = penaltyAmount,
            Currency      = r.Currency,
            Method        = PaymentMethod.Cash,
            Status        = PaymentStatus.Completed,
            PaidAt        = DateTime.UtcNow,
            Notes         = $"Retenue No Show — {penaltyNights} nuit{(penaltyNights > 1 ? "s" : "")}",
        });
        await db.SaveChangesAsync();

        var updated = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .Include(r => r.Prestations).ThenInclude(p => p.Prestation)
            .FirstAsync(r => r.Id == id);

        return (new NoShowBillingResultDto(updated.Id, penaltyNights, penaltyAmount, updated.Currency, ToDto(updated)), null);
    }

    private async Task<bool> CheckOverlapAsync(long roomId, DateOnly checkIn, DateOnly checkOut)
    {
        var resaOverlap = await db.Reservations.AnyAsync(r =>
            r.RoomId == roomId &&
            r.Status != ReservationStatus.Cancelled &&
            r.Status != ReservationStatus.NoShow &&
            r.CheckInDate  < checkOut &&
            r.CheckOutDate > checkIn);

        if (resaOverlap) return true;

        var blockOverlap = await db.RoomBlocks.AnyAsync(b =>
            b.RoomId == roomId &&
            b.StartDate < checkOut &&
            b.EndDate   > checkIn);

        return blockOverlap;
    }

    private async Task CreateFolioFromReservationAsync(Reservation r)
    {
        var config = await db.HotelConfig.FindAsync(1);
        if (config is null) return;

        var nights = r.CheckOutDate.DayNumber - r.CheckInDate.DayNumber;
        var unit   = r.Room ?? await db.Rooms
            .Where(rm => rm.CategoryId == r.CategoryId && rm.Status == RoomStatus.Available)
            .FirstOrDefaultAsync();

        if (unit is null) return;

        var tarif = TarifEngine.ForStay(unit.TarifNuit, unit.TarifN15, unit.TarifN30, nights);

        config.ResaSeq++;
        var number = $"FL-{config.DateHotel.Year}-{config.ResaSeq:D4}";

        var folio = new Folio
        {
            Number        = number,
            UnitId        = unit.Id,
            Nom           = r.Client.LastName,
            Prenom        = r.Client.FirstName,
            Guest         = r.Client.FullName,
            Segment       = FolioSegment.Direct,
            Pax           = r.Adults,
            Arrival       = r.CheckInDate,
            Departure     = r.CheckOutDate,
            Rate          = tarif.PerNight,
            TarifTier     = tarif.Tier,
            ElecIncluded  = tarif.ElecIncluded,
            ResaStatus    = FolioStatus.Confirmee,
            ReservationId = r.Id,
            Note          = r.SpecialRequests,
        };

        db.Folios.Add(folio);
    }

    private async Task<string> GenerateReferenceAsync()
    {
        var year  = DateTime.UtcNow.Year;
        var count = await db.Reservations.CountAsync(r => r.CreatedAt.Year == year) + 1;
        return $"JW-{year}-{count:D5}";
    }

    private static ReservationDto ToDto(Reservation r)
    {
        var totalPrestations = r.Prestations.Sum(p => p.TotalLigne);
        var totalHeb         = r.TotalPrice - totalPrestations;

        var prestationsDto = r.Prestations.Select(p => new ReservationPrestationDto(
            p.Id, p.PrestationId,
            p.Prestation.NameFr, p.Prestation.NameEn, p.Prestation.Icon, p.Prestation.Mode,
            p.Quantite, p.PrixUnitaireSnapshot, p.TotalLigne
        )).ToList();

        return new(
            r.Id, r.Reference,
            r.RoomId, r.Room?.RoomNumber, r.Room?.NameFr, r.Room?.NameEn,
            r.CategoryId, r.Category.Slug, r.Category.NameFr, r.Category.NameEn,
            r.ClientId, r.Client.FullName, r.Client.Email, r.Client.Phone,
            r.CheckInDate, r.CheckOutDate, r.Nights, r.Adults, r.Children,
            r.PricePerNightSnapshot, r.TotalPrice, r.Currency,
            r.Status.ToString(), r.Source, r.SpecialRequests, r.InternalNotes,
            r.AmountPaid, r.AmountDue,
            r.ConfirmedAt, r.CancelledAt, r.CreatedAt,
            r.GarantieType, r.GarantieMontantCash, r.CarteNom, r.CarteSuffix, r.CarteExpiration,
            totalHeb, totalPrestations, prestationsDto
        );
    }
}
