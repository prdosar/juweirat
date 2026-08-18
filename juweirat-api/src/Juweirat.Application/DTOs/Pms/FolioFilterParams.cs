using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Pms;

public class FolioFilterParams : PaginationParams
{
    public bool? Closed { get; set; }
    public long? UnitId { get; set; }
    public string? ResaStatus { get; set; }
    public string? Segment { get; set; }
    public string? BalanceStatus { get; set; } // with_balance | settled
    public DateOnly? ArrivalFrom { get; set; }
    public DateOnly? ArrivalTo { get; set; }
    public DateOnly? DepartureFrom { get; set; }
    public DateOnly? DepartureTo { get; set; }
}
