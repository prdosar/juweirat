using System.Linq.Expressions;
using Juweirat.Application.Common.Pagination;
using Juweirat.Infrastructure.Extensions;

namespace Juweirat.Infrastructure.Services;

public class PaginationService
{
    /// <summary>
    /// Pagine une requête avec un mappeur d'entité vers DTO.
    /// </summary>
    public Task<PagedResult<TDto>> CreatePagedResultAsync<TEntity, TDto>(
        IQueryable<TEntity> query,
        PaginationParams pagination,
        Func<TEntity, TDto> mapper,
        CancellationToken cancellationToken = default)
    {
        return query.ToPagedResultAsync(pagination, mapper, cancellationToken);
    }

    /// <summary>
    /// Pagine une requête directement sur le type de données.
    /// </summary>
    public Task<PagedResult<T>> CreatePagedResultAsync<T>(
        IQueryable<T> query,
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        return query.ToPagedResultAsync(pagination, cancellationToken);
    }

    /// <summary>
    /// Pagine une requête avec projection SQL (Select).
    /// </summary>
    public Task<PagedResult<TDto>> CreatePagedResultAsync<TEntity, TDto>(
        IQueryable<TEntity> query,
        PaginationParams pagination,
        Expression<Func<TEntity, TDto>> selector,
        CancellationToken cancellationToken = default)
    {
        return query.ToPagedResultAsync(pagination, selector, cancellationToken);
    }
}
