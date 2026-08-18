using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Clients;

public class ClientFilterParams : PaginationParams
{
    public string? Nationality { get; set; }
    public string? DocumentType { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public bool? HasReservations { get; set; }
}
