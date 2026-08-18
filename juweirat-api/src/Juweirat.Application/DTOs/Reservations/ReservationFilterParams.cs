using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Reservations;

public class ReservationFilterParams : PaginationParams
{
    public string? Status { get; set; }
    public long? CategoryId { get; set; }
    public long? RoomId { get; set; }
    public long? ClientId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Source { get; set; }
    public string? PaymentStatus { get; set; } // Paid, Partial, Unpaid
}
