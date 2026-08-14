using Juweirat.Application.DTOs.Reservations;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class ReservationService(AppDbContext db)
{
    public async Task<List<ReservationDto>> GetAllAsync(string? status = null)
    {
        var query = db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
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
            .FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : ToDto(r);
    }

    public async Task<(ReservationDto? dto, string? error)> CreateAsync(CreateReservationRequest req)
    {
        if (req.CheckOutDate <= req.CheckInDate)
            return (null, "checkOutDate must be after checkInDate");

        var category = await db.RoomCategories.FindAsync(req.CategoryId);
        if (category is null) return (null, "Category not found");

        var nights = req.CheckOutDate.DayNumber - req.CheckInDate.DayNumber;

        Room? room = null;
        if (req.RoomId is not null)
        {
            room = await db.Rooms.FindAsync(req.RoomId.Value);
            if (room is null) return (null, "Room not found");
            if (room.CategoryId != req.CategoryId) return (null, "Room does not belong to the requested category");
            if (room.Status != RoomStatus.Available) return (null, "Room is not available");

            var overlap = await CheckOverlapAsync(req.RoomId.Value, req.CheckInDate, req.CheckOutDate);
            if (overlap) return (null, "Room is already reserved for these dates");
        }
        else
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
                    room = await db.Rooms.FindAsync(candidateId);
                    break;
                }
            }
        }

        // Tarification selon le palier
        var tarifResult = TarifEngine.ForStay(
            category.TarifNuit, category.TarifN15, category.TarifN30, nights);
        var total = (decimal)tarifResult.PerNight * nights;

        var reservation = new Reservation
        {
            Reference             = await GenerateReferenceAsync(),
            CategoryId            = req.CategoryId,
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
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();

        var created = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Category)
            .Include(r => r.Client)
            .Include(r => r.Payments)
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

    private static ReservationDto ToDto(Reservation r) => new(
        r.Id, r.Reference,
        r.RoomId, r.Room?.RoomNumber, r.Room?.NameFr, r.Room?.NameEn,
        r.CategoryId, r.Category.Slug, r.Category.NameFr, r.Category.NameEn,
        r.ClientId, r.Client.FullName, r.Client.Email, r.Client.Phone,
        r.CheckInDate, r.CheckOutDate, r.Nights, r.Adults, r.Children,
        r.PricePerNightSnapshot, r.TotalPrice, r.Currency,
        r.Status.ToString(), r.Source, r.SpecialRequests, r.InternalNotes,
        r.AmountPaid, r.AmountDue,
        r.ConfirmedAt, r.CancelledAt, r.CreatedAt
    );
}
