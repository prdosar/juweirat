using System.Linq.Expressions;
using System.Reflection;
using Juweirat.Application.Common.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Extensions;

public static class QueryableExtensions
{
    /// <summary>
    /// Applique la pagination et renvoie un résultat paginé asynchrone.
    /// </summary>
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        PaginationParams pagination,
        CancellationToken cancellationToken = default)
    {
        var totalCount = await query.CountAsync(cancellationToken);

        if (totalCount == 0)
        {
            return PagedResult<T>.Empty(pagination.PageNumber, pagination.PageSize);
        }

        // Appliquer le tri dynamique si spécifié
        if (!string.IsNullOrWhiteSpace(pagination.SortBy))
        {
            query = query.ApplySorting(pagination.SortBy, pagination.IsDescending);
        }

        var skip = (pagination.PageNumber - 1) * pagination.PageSize;
        var items = await query
            .Skip(skip)
            .Take(pagination.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<T>(items, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Applique la pagination avec fonction de mapping (TEntity -> TDto).
    /// </summary>
    public static async Task<PagedResult<TDto>> ToPagedResultAsync<TEntity, TDto>(
        this IQueryable<TEntity> query,
        PaginationParams pagination,
        Func<TEntity, TDto> mapper,
        CancellationToken cancellationToken = default)
    {
        var pagedEntities = await query.ToPagedResultAsync(pagination, cancellationToken);
        return pagedEntities.Map(mapper);
    }

    /// <summary>
    /// Applique la projection SQL (Select) puis la pagination asynchrone.
    /// </summary>
    public static async Task<PagedResult<TDto>> ToPagedResultAsync<TEntity, TDto>(
        this IQueryable<TEntity> query,
        PaginationParams pagination,
        Expression<Func<TEntity, TDto>> selector,
        CancellationToken cancellationToken = default)
    {
        var totalCount = await query.CountAsync(cancellationToken);

        if (totalCount == 0)
        {
            return PagedResult<TDto>.Empty(pagination.PageNumber, pagination.PageSize);
        }

        if (!string.IsNullOrWhiteSpace(pagination.SortBy))
        {
            query = query.ApplySorting(pagination.SortBy, pagination.IsDescending);
        }

        var skip = (pagination.PageNumber - 1) * pagination.PageSize;
        var items = await query
            .Select(selector)
            .Skip(skip)
            .Take(pagination.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<TDto>(items, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Applique un tri dynamique sur une propriété par son nom (insensible à la casse).
    /// </summary>
    public static IQueryable<T> ApplySorting<T>(
        this IQueryable<T> query,
        string? sortBy,
        bool isDescending = false)
    {
        if (string.IsNullOrWhiteSpace(sortBy)) return query;

        var entityType = typeof(T);
        var property = entityType.GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
            .FirstOrDefault(p => p.Name.Equals(sortBy, StringComparison.OrdinalIgnoreCase));

        if (property == null) return query;

        var parameter = Expression.Parameter(entityType, "x");
        var propertyAccess = Expression.MakeMemberAccess(parameter, property);
        var orderByExp = Expression.Lambda(propertyAccess, parameter);

        var methodName = isDescending ? "OrderByDescending" : "OrderBy";
        var resultExp = Expression.Call(
            typeof(Queryable),
            methodName,
            [entityType, property.PropertyType],
            query.Expression,
            Expression.Quote(orderByExp));

        return query.Provider.CreateQuery<T>(resultExp);
    }

    /// <summary>
    /// Applique un filtre de recherche texte insensible à la casse sur plusieurs champs de l'entité.
    /// </summary>
    public static IQueryable<T> ApplySearch<T>(
        this IQueryable<T> query,
        string? search,
        params Expression<Func<T, string?>>[] stringProperties)
    {
        if (string.IsNullOrWhiteSpace(search) || stringProperties == null || stringProperties.Length == 0)
            return query;

        var cleanSearch = search.Trim().ToLower();
        var parameter = Expression.Parameter(typeof(T), "x");

        Expression? combinedOr = null;
        var toLowerMethod = typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!;
        var containsMethod = typeof(string).GetMethod(nameof(string.Contains), [typeof(string)])!;
        var searchConstant = Expression.Constant(cleanSearch);

        foreach (var propExpr in stringProperties)
        {
            // Extraire l'accès à la propriété
            var body = Expression.Invoke(propExpr, parameter);
            var notNull = Expression.NotEqual(body, Expression.Constant(null, typeof(string)));
            var toLower = Expression.Call(body, toLowerMethod);
            var contains = Expression.Call(toLower, containsMethod, searchConstant);
            var condition = Expression.AndAlso(notNull, contains);

            combinedOr = combinedOr == null ? condition : Expression.OrElse(combinedOr, condition);
        }

        if (combinedOr == null) return query;

        var lambda = Expression.Lambda<Func<T, bool>>(combinedOr, parameter);
        return query.Where(lambda);
    }
}
