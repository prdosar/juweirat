using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class Reservation
{
    public long Id { get; set; }
    public string Reference { get; set; } = string.Empty; // JW-2026-00042
    public long? RoomId { get; set; }
    public long CategoryId { get; set; }
    public long ClientId { get; set; }
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int Nights { get; set; }
    public int Adults { get; set; } = 1;
    public int Children { get; set; } = 0;
    public decimal PricePerNightSnapshot { get; set; }
    public decimal TotalPrice { get; set; }
    public string Currency { get; set; } = "XOF";
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;
    public string? Source { get; set; } // website | phone | walkIn | bookingCom | airbnb
    public string? SpecialRequests { get; set; }
    public string? InternalNotes { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Room? Room { get; set; }
    public RoomCategory Category { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = [];

    // Folio PMS créé lorsque la réservation est prise en charge par la réception.
    public Folio? Folio { get; set; }

    public decimal AmountPaid => Payments
        .Where(p => p.Status == PaymentStatus.Completed)
        .Sum(p => p.Amount);

    public decimal AmountDue => TotalPrice - AmountPaid;
}
