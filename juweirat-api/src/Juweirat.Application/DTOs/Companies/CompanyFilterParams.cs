using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.Companies;

public class CompanyFilterParams : PaginationParams
{
    public bool? IsActive { get; set; }
}
