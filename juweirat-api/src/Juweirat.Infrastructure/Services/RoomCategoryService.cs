using Juweirat.Application.DTOs.Rooms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class RoomCategoryService(AppDbContext db)
{
    public async Task<List<RoomCategoryDto>> GetAllAsync()
    {
        var categories = await db.RoomCategories
            .Include(c => c.Rooms)
            .OrderBy(c => c.PmsGamme)
            .ThenBy(c => c.PmsType)
            .ToListAsync();

        return categories.Select(ToDto).ToList();
    }

    public async Task<List<RoomCategoryDto>> GetAvailableAsync(DateOnly checkIn, DateOnly checkOut, int adults)
    {
        var occupiedRoomIds = await db.Reservations
            .Where(r =>
                r.Status != ReservationStatus.Cancelled &&
                r.Status != ReservationStatus.NoShow &&
                r.RoomId != null &&
                r.CheckInDate  < checkOut &&
                r.CheckOutDate > checkIn)
            .Select(r => r.RoomId!.Value)
            .ToListAsync();

        var blockedRoomIds = await db.RoomBlocks
            .Where(b => b.StartDate < checkOut && b.EndDate > checkIn)
            .Select(b => b.RoomId)
            .ToListAsync();

        var folioOccupiedIds = await db.Folios
            .Where(f =>
                f.ResaStatus != FolioResaStatus.Annulee &&
                f.ResaStatus != FolioResaStatus.NoShow &&
                !f.Closed &&
                f.Arrival  < checkOut &&
                f.Departure > checkIn)
            .Select(f => f.UnitId)
            .ToListAsync();

        var unavailable = occupiedRoomIds
            .Union(blockedRoomIds)
            .Union(folioOccupiedIds)
            .ToHashSet();

        var categories = await db.RoomCategories
            .Include(c => c.Rooms)
            .Where(c => c.Rooms.Any(r =>
                r.Status == RoomStatus.Available &&
                r.CapacityAdults >= adults &&
                !unavailable.Contains(r.Id)))
            .OrderBy(c => c.PmsGamme)
            .ThenBy(c => c.PmsType)
            .ToListAsync();

        return categories.Select(ToDto).ToList();
    }

    public async Task<RoomCategoryDto?> GetByIdAsync(long id)
    {
        var cat = await db.RoomCategories
            .Include(c => c.Rooms)
            .FirstOrDefaultAsync(c => c.Id == id);
        return cat is null ? null : ToDto(cat);
    }

    public async Task<RoomCategoryDto?> GetBySlugAsync(string slug)
    {
        var cat = await db.RoomCategories
            .Include(c => c.Rooms)
            .FirstOrDefaultAsync(c => c.Slug == slug);
        return cat is null ? null : ToDto(cat);
    }

    public async Task<RoomCategoryDto> CreateAsync(CreateRoomCategoryRequest req)
    {
        var slug = BuildSlug(req.PmsType, req.PmsGamme);
        var cat = new RoomCategory
        {
            Slug             = slug,
            PmsType          = req.PmsType,
            PmsGamme         = req.PmsGamme,
            NameFr           = req.NameFr,
            NameEn           = req.NameEn,
            DescriptionFr    = req.DescriptionFr,
            DescriptionEn    = req.DescriptionEn,
            CapacityAdults   = req.CapacityAdults,
            CapacityChildren = req.CapacityChildren,
            TarifNuit        = req.TarifNuit,
            TarifN15         = req.TarifN15,
            TarifN30         = req.TarifN30,
        };
        db.RoomCategories.Add(cat);
        await db.SaveChangesAsync();
        return ToDto(cat);
    }

    public async Task<RoomCategoryDto?> UpdateAsync(long id, CreateRoomCategoryRequest req)
    {
        var cat = await db.RoomCategories.Include(c => c.Rooms).FirstOrDefaultAsync(c => c.Id == id);
        if (cat is null) return null;

        cat.PmsType          = req.PmsType;
        cat.PmsGamme         = req.PmsGamme;
        cat.Slug             = BuildSlug(req.PmsType, req.PmsGamme);
        cat.NameFr           = req.NameFr;
        cat.NameEn           = req.NameEn;
        cat.DescriptionFr    = req.DescriptionFr;
        cat.DescriptionEn    = req.DescriptionEn;
        cat.CapacityAdults   = req.CapacityAdults;
        cat.CapacityChildren = req.CapacityChildren;
        cat.TarifNuit        = req.TarifNuit;
        cat.TarifN15         = req.TarifN15;
        cat.TarifN30         = req.TarifN30;

        await db.SaveChangesAsync();
        return ToDto(cat);
    }

    private static string BuildSlug(string pmsType, string pmsGamme)
    {
        var gamme = pmsGamme
            .ToLowerInvariant()
            .Replace("é", "e")
            .Replace("è", "e")
            .Replace("ê", "e")
            .Replace("à", "a")
            .Replace("î", "i")
            .Replace(" ", "-");
        return $"{pmsType.ToLowerInvariant()}-{gamme}";
    }

    private static RoomCategoryDto ToDto(RoomCategory c) => new(
        c.Id, c.Slug, c.PmsType, c.PmsGamme,
        c.NameFr, c.NameEn, c.DescriptionFr, c.DescriptionEn,
        c.CapacityAdults, c.CapacityChildren,
        c.TarifNuit, c.TarifN15, c.TarifN30,
        c.Rooms.Count
    );
}
