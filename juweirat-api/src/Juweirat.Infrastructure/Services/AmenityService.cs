using Juweirat.Application.DTOs.Rooms;
using Juweirat.Domain.Entities;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class AmenityService(AppDbContext db)
{
    public async Task<List<AmenityDto>> GetAllAsync()
    {
        var list = await db.Amenities
            .OrderBy(a => a.NameFr)
            .ToListAsync();

        return list.Select(a => new AmenityDto(a.Id, a.NameFr, a.NameEn, a.Icon)).ToList();
    }

    public async Task<(AmenityDto? dto, string? error)> CreateAsync(CreateAmenityRequest req)
    {
        var amenity = new Amenity
        {
            NameFr = req.NameFr,
            NameEn = req.NameEn,
            Icon   = req.Icon,
        };

        db.Amenities.Add(amenity);
        await db.SaveChangesAsync();
        return (new AmenityDto(amenity.Id, amenity.NameFr, amenity.NameEn, amenity.Icon), null);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var amenity = await db.Amenities.FindAsync(id);
        if (amenity is null) return false;
        db.Amenities.Remove(amenity);
        await db.SaveChangesAsync();
        return true;
    }
}
