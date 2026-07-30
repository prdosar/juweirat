using Juweirat.Domain.Enums;

namespace Juweirat.Domain.Entities;

public class Payment
{
    public long Id { get; set; }
    public long ReservationId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "XOF";
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? InternalReference { get; set; }
    public string? GatewayReference { get; set; }
    public string? GatewayResponse { get; set; } // JSON brut
    public string? Notes { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Reservation Reservation { get; set; } = null!;
}
