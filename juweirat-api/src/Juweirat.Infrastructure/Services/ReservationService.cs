using Juweirat.Application.DTOs.Reservations;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class ReservationService(AppDbContext db)
{
    public async Task<List<ReservationDto>> GetAllAsync(string? status = null)
    {
        var query = db.Reservations
            .Include(r => r.Room)
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
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .FirstOrDefaultAsync(r => r.Id == id);
        return r is null ? null : ToDto(r);
    }

    public async Task<(ReservationDto? dto, string? error)> CreateAsync(CreateReservationRequest req)
    {
        if (req.CheckOutDate <= req.CheckInDate)
            return (null, "checkOutDate must be after checkInDate");

        var room = await db.Rooms.FindAsync(req.RoomId);
        if (room is null) return (null, "Room not found");
        if (room.Status != RoomStatus.Available) return (null, "Room is not available");

        var overlap = await db.Reservations.AnyAsync(r =>
            r.RoomId == req.RoomId &&
            r.Status != ReservationStatus.Cancelled &&
            r.Status != ReservationStatus.NoShow &&
            r.CheckInDate  < req.CheckOutDate &&
            r.CheckOutDate > req.CheckInDate);

        if (overlap) return (null, "Room is already reserved for these dates");

        var blockOverlap = await db.RoomBlocks.AnyAsync(b =>
            b.RoomId == req.RoomId &&
            b.StartDate < req.CheckOutDate &&
            b.EndDate   > req.CheckInDate);

        if (blockOverlap) return (null, "Room is blocked for these dates");

        var nights = req.CheckOutDate.DayNumber - req.CheckInDate.DayNumber;
        var total  = room.PricePerNight * nights;

        var reservation = new Reservation
        {
            Reference              = await GenerateReferenceAsync(),
            RoomId                 = req.RoomId,
            ClientId               = req.ClientId,
            CheckInDate            = req.CheckInDate,
            CheckOutDate           = req.CheckOutDate,
            Nights                 = nights,
            Adults                 = req.Adults,
            Children               = req.Children,
            PricePerNightSnapshot  = room.PricePerNight,
            TotalPrice             = total,
            Currency               = req.Currency,
            Source                 = req.Source,
            SpecialRequests        = req.SpecialRequests,
            InternalNotes          = req.InternalNotes,
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();

        var created = await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Client)
            .Include(r => r.Payments)
            .FirstAsync(r => r.Id == reservation.Id);

        return (ToDto(created), null);
    }

    public async Task<(ReservationDto? dto, string? error)> UpdateStatusAsync(long id, UpdateReservationStatusRequest req)
    {
        var r = await db.Reservations
            .Include(r => r.Room)
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
                break;
            case ReservationStatus.Cancelled:
                r.CancelledAt         = DateTime.UtcNow;
                r.CancellationReason  = req.CancellationReason;
                break;
        }

        await db.SaveChangesAsync();
        return (ToDto(r), null);
    }

    private async Task<string> GenerateReferenceAsync()
    {
        var year  = DateTime.UtcNow.Year;
        var count = await db.Reservations.CountAsync(r => r.CreatedAt.Year == year) + 1;
        return $"JW-{year}-{count:D5}";
    }

    private static ReservationDto ToDto(Reservation r) => new(
        r.Id, r.Reference,
        r.RoomId, r.Room.RoomNumber, r.Room.NameFr, r.Room.NameEn,
        r.ClientId, r.Client.FullName, r.Client.Email, r.Client.Phone,
        r.CheckInDate, r.CheckOutDate, r.Nights, r.Adults, r.Children,
        r.PricePerNightSnapshot, r.TotalPrice, r.Currency,
        r.Status.ToString(), r.Source, r.SpecialRequests, r.InternalNotes,
        r.AmountPaid, r.AmountDue,
        r.ConfirmedAt, r.CancelledAt, r.CreatedAt
    );
}
