using Juweirat.Application.DTOs.Pms;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class MaintenanceStaffService(AppDbContext db)
{
    // ── Categories ────────────────────────────────────────────────────────────

    public async Task<List<MaintenanceCategoryDto>> GetCategoriesAsync()
    {
        var list = await db.MaintenanceCategories
            .Include(c => c.Staff)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return list.Select(ToCategoryDto).ToList();
    }

    public async Task<MaintenanceCategoryDto> CreateCategoryAsync(CreateMaintenanceCategoryRequest req)
    {
        var cat = new MaintenanceCategory { Name = req.Name.Trim() };
        db.MaintenanceCategories.Add(cat);
        await db.SaveChangesAsync();
        cat.Staff = [];
        return ToCategoryDto(cat);
    }

    public async Task<MaintenanceCategoryDto?> UpdateCategoryAsync(long id, UpdateMaintenanceCategoryRequest req)
    {
        var cat = await db.MaintenanceCategories.Include(c => c.Staff).FirstOrDefaultAsync(c => c.Id == id);
        if (cat is null) return null;
        if (req.Name is not null)     cat.Name     = req.Name.Trim();
        if (req.IsActive is not null) cat.IsActive = req.IsActive.Value;
        await db.SaveChangesAsync();
        return ToCategoryDto(cat);
    }

    public async Task<bool> DeleteCategoryAsync(long id)
    {
        var cat = await db.MaintenanceCategories.Include(c => c.Staff).FirstOrDefaultAsync(c => c.Id == id);
        if (cat is null) return false;
        if (cat.Staff.Count > 0) return false; // refuse if still has staff
        db.MaintenanceCategories.Remove(cat);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Staff ─────────────────────────────────────────────────────────────────

    public async Task<List<MaintenanceStaffDto>> GetStaffAsync(long? categoryId = null, bool activeOnly = false)
    {
        var query = db.MaintenanceStaff
            .Include(s => s.Category)
            .AsQueryable();

        if (categoryId.HasValue) query = query.Where(s => s.CategoryId == categoryId.Value);
        if (activeOnly)          query = query.Where(s => s.IsActive);

        var list = await query.OrderBy(s => s.Category.Name).ThenBy(s => s.LastName).ToListAsync();
        return list.Select(ToStaffDto).ToList();
    }

    public async Task<(MaintenanceStaffDto? dto, string? error)> CreateStaffAsync(CreateMaintenanceStaffRequest req)
    {
        var catExists = await db.MaintenanceCategories.AnyAsync(c => c.Id == req.CategoryId);
        if (!catExists) return (null, "Category not found");

        var staff = new MaintenanceStaff
        {
            CategoryId = req.CategoryId,
            FirstName  = req.FirstName.Trim(),
            LastName   = req.LastName.Trim(),
            Phone      = req.Phone?.Trim(),
        };
        db.MaintenanceStaff.Add(staff);
        await db.SaveChangesAsync();

        var created = await db.MaintenanceStaff.Include(s => s.Category).FirstAsync(s => s.Id == staff.Id);
        return (ToStaffDto(created), null);
    }

    public async Task<MaintenanceStaffDto?> UpdateStaffAsync(long id, UpdateMaintenanceStaffRequest req)
    {
        var staff = await db.MaintenanceStaff.Include(s => s.Category).FirstOrDefaultAsync(s => s.Id == id);
        if (staff is null) return null;

        if (req.CategoryId is not null) staff.CategoryId = req.CategoryId.Value;
        if (req.FirstName  is not null) staff.FirstName  = req.FirstName.Trim();
        if (req.LastName   is not null) staff.LastName   = req.LastName.Trim();
        if (req.Phone      is not null) staff.Phone      = req.Phone.Trim();
        if (req.IsActive   is not null) staff.IsActive   = req.IsActive.Value;

        await db.SaveChangesAsync();

        // reload category if changed
        await db.Entry(staff).Reference(s => s.Category).LoadAsync();
        return ToStaffDto(staff);
    }

    public async Task<bool> DeleteStaffAsync(long id)
    {
        var staff = await db.MaintenanceStaff.FindAsync(id);
        if (staff is null) return false;
        db.MaintenanceStaff.Remove(staff);
        await db.SaveChangesAsync();
        return true;
    }

    private static MaintenanceCategoryDto ToCategoryDto(MaintenanceCategory c) =>
        new(c.Id, c.Name, c.IsActive, c.Staff.Count);

    private static MaintenanceStaffDto ToStaffDto(MaintenanceStaff s) =>
        new(s.Id, s.CategoryId, s.Category.Name, s.FirstName, s.LastName, s.Phone, s.IsActive, s.FullName);
}
