using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Payments;

public class PaymentFilterParams : PaginationParams
{
    public string? Status { get; set; }
    public string? Method { get; set; }
    public long? ReservationId { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Currency { get; set; }
}
