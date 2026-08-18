namespace Juweirat.Application.Common.Pagination;

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedResult() { }

    public PagedResult(IReadOnlyList<T> items, int count, int pageNumber, int pageSize)
    {
        TotalCount = count;
        PageNumber = pageNumber < 1 ? 1 : pageNumber;
        PageSize = pageSize < 1 ? 1 : pageSize;
        TotalPages = PageSize > 0 ? (int)Math.Ceiling(count / (double)PageSize) : 0;
        Items = items;
    }

    public PagedResult<TDto> Map<TDto>(Func<T, TDto> mapper)
    {
        var mappedItems = Items.Select(mapper).ToList();
        return new PagedResult<TDto>(mappedItems, TotalCount, PageNumber, PageSize);
    }

    public static PagedResult<T> Empty(int pageNumber = 1, int pageSize = 20)
        => new([], 0, pageNumber, pageSize);
}
