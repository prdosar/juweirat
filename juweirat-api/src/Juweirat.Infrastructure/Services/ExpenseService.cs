using Juweirat.Application.Common.Pagination;
using Juweirat.Application.DTOs.Expenses;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Juweirat.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class ExpenseService(AppDbContext db, AccountingService accountingService)
{
    public async Task<PagedResult<ExpenseDto>> GetAllAsync(ExpenseFilterParams filter)
    {
        var query = db.Expenses
            .Include(e => e.Category)
            .Include(e => e.Supplier)
            .Include(e => e.CashRegister)
            .AsQueryable();

        if (filter.From is not null)
            query = query.Where(e => e.Date >= EnsureUtc(filter.From.Value));
        if (filter.To is not null)
            query = query.Where(e => e.Date <= EnsureUtc(filter.To.Value));
        if (filter.CategoryId is not null)
            query = query.Where(e => e.CategoryId == filter.CategoryId);
        if (filter.SupplierId is not null)
            query = query.Where(e => e.SupplierId == filter.SupplierId);

        if (string.IsNullOrWhiteSpace(filter.SortBy))
            query = query.OrderByDescending(e => e.Date);

        return await query.ToPagedResultAsync(filter, ToDto);
    }

    public async Task<ExpenseReportDto> GetReportAsync(DateTime? from, DateTime? to)
    {
        var query = db.Expenses
            .Include(e => e.Category)
            .AsQueryable();

        if (from is not null) query = query.Where(e => e.Date >= EnsureUtc(from.Value));
        if (to is not null)   query = query.Where(e => e.Date <= EnsureUtc(to.Value));

        var expenses = await query.OrderByDescending(e => e.Date).ToListAsync();

        var byCategory = expenses
            .GroupBy(e => e.Category)
            .Select(g => new ExpenseByCategoryDto(
                g.Key.Id,
                g.Key.Name,
                g.Key.Color,
                g.Sum(e => e.Amount),
                g.Count()))
            .OrderByDescending(x => x.Total)
            .ToList();

        return new ExpenseReportDto(
            from,
            to,
            expenses.Sum(e => e.Amount),
            byCategory,
            expenses.Select(ToDto).ToList()
        );
    }

    public async Task<ExpenseDto?> GetByIdAsync(long id)
    {
        var expense = await db.Expenses
            .Include(e => e.Category)
            .Include(e => e.Supplier)
            .Include(e => e.CashRegister)
            .FirstOrDefaultAsync(e => e.Id == id);
        return expense is null ? null : ToDto(expense);
    }

    public async Task<(ExpenseDto? dto, string? error)> CreateAsync(CreateExpenseRequest req, long? userId = null)
    {
        if (req.Amount <= 0) return (null, "Le montant doit être supérieur à zéro.");

        var categoryExists = await db.ExpenseCategories.AnyAsync(c => c.Id == req.CategoryId && c.IsActive);
        if (!categoryExists) return (null, "Catégorie introuvable ou inactive.");

        var expense = new Expense
        {
            Date            = EnsureUtc(req.Date),
            Label           = req.Label.Trim(),
            Amount          = req.Amount,
            Notes           = req.Notes?.Trim(),
            CategoryId      = req.CategoryId,
            SupplierId      = req.SupplierId,
            CashRegisterId  = req.CashRegisterId,
            CreatedByUserId = userId,
        };
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();

        // Écriture comptable fire-and-forget
        try
        {
            await accountingService.PostExpensePaymentAsync(
                expense.Id,
                req.CashRegisterId,
                req.Amount,
                expense.Label,
                userId);
        }
        catch { /* ne jamais bloquer le métier */ }

        var dto = await GetByIdAsync(expense.Id);
        return (dto, null);
    }

    public async Task<string?> DeleteAsync(long id)
    {
        var expense = await db.Expenses
            .Include(e => e.Category)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (expense is null) return "Charge introuvable.";

        // Mouvement comptable inverse
        try
        {
            await accountingService.ReverseExpensePaymentAsync(
                expense.Id,
                expense.CashRegisterId,
                expense.Amount,
                expense.Label);
        }
        catch { }

        db.Expenses.Remove(expense);
        await db.SaveChangesAsync();
        return null;
    }

    private static ExpenseDto ToDto(Expense e) => new(
        e.Id,
        e.Date,
        e.Label,
        e.Amount,
        e.Notes,
        e.CategoryId,
        e.Category.Name,
        e.Category.Color,
        e.SupplierId,
        e.Supplier?.Name,
        e.CashRegisterId,
        e.CashRegister?.Name,
        e.CreatedByUserId,
        e.CreatedAt
    );

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind switch
        {
            DateTimeKind.Utc   => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _                  => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
        };
}
