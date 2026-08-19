using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Payments;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class PaymentService(AppDbContext db, AccountingService accountingService)
{
    public async Task<PagedResult<PaymentDto>> GetPagedAsync(PaymentFilterParams filter)
    {
        var query = db.Payments
            .Include(p => p.Reservation).ThenInclude(r => r.Client)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(p =>
                (p.InternalReference != null && p.InternalReference.ToLower().Contains(search)) ||
                (p.GatewayReference != null && p.GatewayReference.ToLower().Contains(search)) ||
                (p.Notes != null && p.Notes.ToLower().Contains(search)) ||
                p.Reservation.Reference.ToLower().Contains(search) ||
                (p.Reservation.Client != null && (
                    p.Reservation.Client.FirstName.ToLower().Contains(search) ||
                    p.Reservation.Client.LastName.ToLower().Contains(search)
                )));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<PaymentStatus>(filter.Status, true, out var st))
        {
            query = query.Where(p => p.Status == st);
        }

        if (!string.IsNullOrWhiteSpace(filter.Method) && Enum.TryParse<PaymentMethod>(filter.Method, true, out var m))
        {
            query = query.Where(p => p.Method == m);
        }

        if (filter.ReservationId.HasValue)
            query = query.Where(p => p.ReservationId == filter.ReservationId.Value);

        if (filter.MinAmount.HasValue)
            query = query.Where(p => p.Amount >= filter.MinAmount.Value);

        if (filter.MaxAmount.HasValue)
            query = query.Where(p => p.Amount <= filter.MaxAmount.Value);

        if (filter.StartDate.HasValue)
            query = query.Where(p => (p.PaidAt != null && p.PaidAt >= filter.StartDate.Value) || p.CreatedAt >= filter.StartDate.Value);

        if (filter.EndDate.HasValue)
            query = query.Where(p => (p.PaidAt != null && p.PaidAt <= filter.EndDate.Value) || p.CreatedAt <= filter.EndDate.Value);

        if (!string.IsNullOrWhiteSpace(filter.Currency))
            query = query.Where(p => p.Currency.ToLower() == filter.Currency.ToLower());

        if (string.IsNullOrWhiteSpace(filter.SortBy))
        {
            query = query.OrderByDescending(p => p.PaidAt ?? p.CreatedAt);
        }

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<List<PaymentDto>> GetAllAsync()
    {
        var list = await db.Payments
            .Include(p => p.Reservation)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return list.Select(ToDto).ToList();
    }

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

        // Journal comptable — mouvement Client → Caisse. Fire-and-forget non bloquant.
        try
        {
            await accountingService.PostEncaissementAsync(
                clientId:   reservation.ClientId,
                amount:     payment.Amount,
                sourceType: "Payment",
                sourceId:   payment.Id,
                label:      $"Paiement résa {reservation.Reference} · {method}");
        }
        catch { /* silent — écriture manquante corrigeable via OD */ }

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
