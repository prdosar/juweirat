using Juweirat.Application.DTOs.Payments;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class PaymentService(AppDbContext db)
{
    public async Task<List<PaymentDto>> GetByReservationAsync(long reservationId)
    {
        var list = await db.Payments
            .Include(p => p.Reservation)
            .Where(p => p.ReservationId == reservationId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return list.Select(ToDto).ToList();
    }

    public async Task<(PaymentDto? dto, string? error)> CreateAsync(CreatePaymentRequest req)
    {
        var reservation = await db.Reservations
            .Include(r => r.Payments)
            .FirstOrDefaultAsync(r => r.Id == req.ReservationId);

        if (reservation is null) return (null, "Reservation not found");
        if (reservation.Status == ReservationStatus.Cancelled)
            return (null, "Cannot add payment to a cancelled reservation");

        if (!Enum.TryParse<PaymentMethod>(req.Method, true, out var method))
            return (null, $"Invalid payment method: {req.Method}");

        var payment = new Payment
        {
            ReservationId     = req.ReservationId,
            Amount            = req.Amount,
            Currency          = req.Currency,
            Method            = method,
            Status            = PaymentStatus.Completed,
            InternalReference = GenerateInternalRef(),
            Notes             = req.Notes,
            PaidAt            = DateTime.UtcNow,
        };

        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        await db.Entry(payment).Reference(p => p.Reservation).LoadAsync();
        return (ToDto(payment), null);
    }

    public async Task<(PaymentDto? dto, string? error)> HandleGatewayCallbackAsync(
        long paymentId, GatewayCallbackRequest req)
    {
        var payment = await db.Payments
            .Include(p => p.Reservation)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment is null) return (null, "Payment not found");

        payment.GatewayReference = req.GatewayReference;
        payment.GatewayResponse  = req.GatewayResponse;
        payment.Status = req.Status.ToLower() switch
        {
            "completed" or "success" => PaymentStatus.Completed,
            "failed"                 => PaymentStatus.Failed,
            _                        => payment.Status
        };

        if (payment.Status == PaymentStatus.Completed)
            payment.PaidAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return (ToDto(payment), null);
    }

    private static string GenerateInternalRef() =>
        $"PAY-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";

    private static PaymentDto ToDto(Payment p) => new(
        p.Id, p.ReservationId, p.Reservation.Reference,
        p.Amount, p.Currency,
        p.Method.ToString(), p.Status.ToString(),
        p.InternalReference, p.GatewayReference,
        p.Notes, p.PaidAt, p.CreatedAt
    );
}
