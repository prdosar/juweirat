using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Payments;

public record PaymentDto(
    long Id,
    long ReservationId,
    string ReservationReference,
    decimal Amount,
    string Currency,
    string Method,
    string Status,
    string? InternalReference,
    string? GatewayReference,
    string? Notes,
    DateTime? PaidAt,
    DateTime CreatedAt
);

public record CreatePaymentRequest(
    [Required] long ReservationId,
    [Required, Range(1, 9999999)] decimal Amount,
    string Currency = "XOF",
    [Required] string Method = "cash",
    string? Notes = null
);

// Returned by payment gateway (Stripe / FedaPay webhook)
public record GatewayCallbackRequest(
    [Required] string GatewayReference,
    [Required] string Status,   // completed | failed
    string? GatewayResponse = null
);
