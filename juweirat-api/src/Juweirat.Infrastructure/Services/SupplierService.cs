using Juweirat.Application.DTOs.Expenses;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class SupplierService(AppDbContext db)
{
    public async Task<List<SupplierDto>> GetAllAsync(string? search = null, bool includeInactive = false)
    {
        var query = db.Suppliers.AsQueryable();

        if (!includeInactive)
            query = query.Where(s => s.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(s) ||
                (x.Phone != null && x.Phone.ToLower().Contains(s)) ||
                (x.Email != null && x.Email.ToLower().Contains(s)));
        }

        var suppliers = await query.OrderBy(s => s.Name).ToListAsync();

        var supplierIds = suppliers.Select(s => s.Id).ToList();
        var counts = await db.Expenses
            .Where(e => e.SupplierId != null && supplierIds.Contains(e.SupplierId!.Value))
            .GroupBy(e => e.SupplierId!.Value)
            .Select(g => new { SupplierId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SupplierId, x => x.Count);

        return suppliers.Select(s => ToDto(s, counts.GetValueOrDefault(s.Id, 0))).ToList();
    }

    public async Task<SupplierDto?> GetByIdAsync(long id)
    {
        var s = await db.Suppliers.FindAsync(id);
        if (s is null) return null;
        var count = await db.Expenses.CountAsync(e => e.SupplierId == id);
        return ToDto(s, count);
    }

    public async Task<(SupplierDto? dto, string? error)> CreateAsync(CreateSupplierRequest req)
    {
        var name = req.Name.Trim();
        var exists = await db.Suppliers.AnyAsync(s => s.Name.ToLower() == name.ToLower());
        if (exists) return (null, $"Un fournisseur nommé « {name} » existe déjà.");

        var supplier = new Supplier
        {
            Name    = name,
            Phone   = req.Phone?.Trim(),
            Email   = req.Email?.Trim(),
            Address = req.Address?.Trim(),
        };
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return (ToDto(supplier, 0), null);
    }

    public async Task<(SupplierDto? dto, string? error)> UpdateAsync(long id, UpdateSupplierRequest req)
    {
        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier is null) return (null, "Fournisseur introuvable.");

        var name = req.Name.Trim();
        var exists = await db.Suppliers.AnyAsync(s => s.Id != id && s.Name.ToLower() == name.ToLower());
        if (exists) return (null, $"Un fournisseur nommé « {name} » existe déjà.");

        supplier.Name    = name;
        supplier.Phone   = req.Phone?.Trim();
        supplier.Email   = req.Email?.Trim();
        supplier.Address = req.Address?.Trim();
        await db.SaveChangesAsync();

        var count = await db.Expenses.CountAsync(e => e.SupplierId == id);
        return (ToDto(supplier, count), null);
    }

    public async Task<bool> DeactivateAsync(long id)
    {
        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier is null) return false;
        supplier.IsActive = false;
        await db.SaveChangesAsync();
        return true;
    }

    private static SupplierDto ToDto(Supplier s, int expenseCount) => new(
        s.Id,
        s.Name,
        s.Phone,
        s.Email,
        s.Address,
        s.IsActive,
        expenseCount,
        s.CreatedAt
    );
}
