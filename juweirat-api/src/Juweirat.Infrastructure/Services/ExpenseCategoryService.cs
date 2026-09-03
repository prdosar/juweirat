using Juweirat.Application.DTOs.Expenses;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class ExpenseCategoryService(AppDbContext db)
{
    public async Task<List<ExpenseCategoryDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = db.ExpenseCategories.AsQueryable();
        if (!includeInactive)
            query = query.Where(c => c.IsActive);

        var categories = await query.OrderBy(c => c.Name).ToListAsync();

        var categoryIds = categories.Select(c => c.Id).ToList();
        var counts = await db.Expenses
            .Where(e => categoryIds.Contains(e.CategoryId))
            .GroupBy(e => e.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

        return categories.Select(c => ToDto(c, counts.GetValueOrDefault(c.Id, 0))).ToList();
    }

    public async Task<(ExpenseCategoryDto? dto, string? error)> CreateAsync(CreateExpenseCategoryRequest req)
    {
        var name = req.Name.Trim();
        var exists = await db.ExpenseCategories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
        if (exists) return (null, $"Une catégorie « {name} » existe déjà.");

        var category = new ExpenseCategory
        {
            Name  = name,
            Color = req.Color?.Trim(),
        };
        db.ExpenseCategories.Add(category);
        await db.SaveChangesAsync();
        return (ToDto(category, 0), null);
    }

    public async Task<(ExpenseCategoryDto? dto, string? error)> UpdateAsync(long id, UpdateExpenseCategoryRequest req)
    {
        var category = await db.ExpenseCategories.FindAsync(id);
        if (category is null) return (null, "Catégorie introuvable.");

        var name = req.Name.Trim();
        var exists = await db.ExpenseCategories.AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower());
        if (exists) return (null, $"Une catégorie « {name} » existe déjà.");

        category.Name  = name;
        category.Color = req.Color?.Trim();
        await db.SaveChangesAsync();

        var count = await db.Expenses.CountAsync(e => e.CategoryId == id);
        return (ToDto(category, count), null);
    }

    private static ExpenseCategoryDto ToDto(ExpenseCategory c, int count) => new(
        c.Id,
        c.Name,
        c.Color,
        c.IsActive,
        count
    );
}
