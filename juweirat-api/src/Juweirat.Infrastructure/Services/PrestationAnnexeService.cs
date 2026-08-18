using Juweirat.Application.DTOs.Prestations;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class PrestationAnnexeService(AppDbContext db)
{
    public async Task<List<PrestationAnnexeDto>> GetAllAsync(bool activeOnly = false)
    {
        var q = db.PrestationsAnnexes.AsQueryable();
        if (activeOnly) q = q.Where(p => p.IsActive);
        var list = await q.OrderBy(p => p.SortOrder).ThenBy(p => p.Id).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<PrestationAnnexeDto?> GetByIdAsync(long id)
    {
        var p = await db.PrestationsAnnexes.FindAsync(id);
        return p is null ? null : ToDto(p);
    }

    public async Task<PrestationAnnexeDto> CreateAsync(CreatePrestationRequest req)
    {
        var p = new PrestationAnnexe
        {
            NameFr    = req.NameFr,
            NameEn    = req.NameEn,
            Icon      = req.Icon,
            Mode      = req.Mode,
            PrixInclus = req.PrixInclus,
            PrixSeule  = req.PrixSeule,
            SortOrder  = req.SortOrder,
        };
        db.PrestationsAnnexes.Add(p);
        await db.SaveChangesAsync();
        return ToDto(p);
    }

    public async Task<PrestationAnnexeDto?> UpdateAsync(long id, UpdatePrestationRequest req)
    {
        var p = await db.PrestationsAnnexes.FindAsync(id);
        if (p is null) return null;

        if (req.NameFr is not null) p.NameFr = req.NameFr;
        if (req.NameEn is not null) p.NameEn = req.NameEn;
        if (req.Icon is not null)   p.Icon   = req.Icon;
        if (req.Mode is not null)   p.Mode   = req.Mode;
        if (req.PrixInclus is not null) p.PrixInclus = req.PrixInclus.Value;
        if (req.PrixSeule  is not null) p.PrixSeule  = req.PrixSeule.Value;
        if (req.IsActive   is not null) p.IsActive   = req.IsActive.Value;
        if (req.SortOrder  is not null) p.SortOrder  = req.SortOrder.Value;
        p.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(p);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var p = await db.PrestationsAnnexes.FindAsync(id);
        if (p is null) return false;
        db.PrestationsAnnexes.Remove(p);
        await db.SaveChangesAsync();
        return true;
    }

    private static PrestationAnnexeDto ToDto(PrestationAnnexe p) => new(
        p.Id, p.NameFr, p.NameEn, p.Icon, p.Mode,
        p.PrixInclus, p.PrixSeule, p.IsActive, p.SortOrder
    );
}
