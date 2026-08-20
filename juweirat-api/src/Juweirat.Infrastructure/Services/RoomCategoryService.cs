using Juweirat.Application.DTOs.Rooms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class RoomCategoryService(AppDbContext db)
{
    private static readonly Dictionary<string, string[]> DefaultCategoryPhotos = new()
    {
        ["t1-standard"]   = ["/images/IMG_5001.jpg", "/images/IMG_5003.jpg", "/images/IMG_5011.jpg", "/images/IMG_5017.jpg", "/images/IMG_5024.jpg", "/images/IMG_5025.jpg"],
        ["t1-superieure"] = ["/images/IMG_5033.jpg", "/images/IMG_5037.jpg", "/images/IMG_5053.jpg", "/images/IMG_5065.jpg", "/images/IMG_5066.jpg", "/images/IMG_5070.jpg"],
        ["t1-privilege"]  = ["/images/IMG_5075.jpg", "/images/IMG_5076.jpg", "/images/IMG_5079.jpg", "/images/IMG_5084.jpg", "/images/IMG_5086.jpg", "/images/IMG_5095.jpg"],
        ["t2-standard"]   = ["/images/IMG_5111.jpg", "/images/IMG_5118.jpg", "/images/IMG_5119.jpg", "/images/IMG_5121.jpg", "/images/IMG_5125.jpg", "/images/IMG_5130.jpg"],
        ["t2-superieure"] = ["/images/IMG_5141.jpg", "/images/IMG_5143.jpg", "/images/IMG_5145.jpg", "/images/IMG_5152.jpg", "/images/IMG_5153.jpg", "/images/IMG_5160.jpg"],
        ["t2-privilege"]  = ["/images/IMG_5177.jpg", "/images/IMG_5178.jpg", "/images/IMG_5180.jpg", "/images/IMG_5181.jpg", "/images/IMG_5182.jpg", "/images/IMG_5189.jpg"],
        ["t3-standard"]   = ["/images/IMG_5230.jpg", "/images/IMG_5231.jpg", "/images/IMG_5234.jpg", "/images/IMG_5236.jpg", "/images/IMG_5238.jpg", "/images/IMG_5248.jpg"],
        ["t3-superieure"] = ["/images/IMG_5264.jpg", "/images/IMG_5265.jpg", "/images/IMG_5266.jpg", "/images/IMG_5267.jpg", "/images/IMG_5270.jpg", "/images/IMG_5275.jpg"],
        ["t4-suite"]      = ["/images/IMG_5300.jpg", "/images/IMG_5302.jpg", "/images/IMG_5304.jpg", "/images/IMG_5305.jpg", "/images/IMG_5308.jpg", "/images/IMG_5315.jpg"]
    };

    public async Task EnsureImagesSeededAsync()
    {
        var categories = await db.RoomCategories.Include(c => c.Images).ToListAsync();
        bool changed = false;

        foreach (var cat in categories)
        {
            if (cat.Images.Count == 0 && DefaultCategoryPhotos.TryGetValue(cat.Slug, out var photos))
            {
                for (int i = 0; i < photos.Length; i++)
                {
                    cat.Images.Add(new RoomImage
                    {
                        CategoryId = cat.Id,
                        FilePath   = photos[i],
                        SortOrder  = i,
                        IsCover    = i == 0,
                        CreatedAt  = DateTime.UtcNow
                    });
                }
                changed = true;
            }
        }

        if (changed)
        {
            await db.SaveChangesAsync();
        }
    }

    public async Task<List<RoomCategoryDto>> GetAllAsync()
    {
        await EnsureImagesSeededAsync();

        var categories = await db.RoomCategories
            .Include(c => c.Rooms)
            .Include(c => c.Images)
            .OrderBy(c => c.PmsGamme)
            .ThenBy(c => c.PmsType)
            .ToListAsync();

        return categories.Select(ToDto).ToList();
    }

    public async Task<List<RoomCategoryDto>> GetAvailableAsync(DateOnly checkIn, DateOnly checkOut, int adults)
    {
        await EnsureImagesSeededAsync();

        var unavailable = await ComputeUnavailableRoomIdsAsync(checkIn, checkOut);

        // Une chambre est "réellement dispo sur la période" si :
        //   - elle n'est pas retirée du parc (Status = Inactive) ni hors service (HS)
        //   - sa capacité couvre le nombre d'adultes
        //   - aucune résa/folio/block ne la bloque sur la fenêtre demandée
        // On NE filtre PAS sur Status = Available : Occupied/Maintenance sont des
        // états instantanés qui n'empêchent pas une résa future — la disponibilité
        // à une date donnée est déjà encapsulée dans ComputeUnavailableRoomIdsAsync.
        var categories = await db.RoomCategories
            .Include(c => c.Rooms)
            .Include(c => c.Images)
            .Where(c => c.Rooms.Any(r =>
                r.Status != RoomStatus.Inactive &&
                !r.HorsService &&
                r.CapacityAdults >= adults &&
                !unavailable.Contains(r.Id)))
            .OrderBy(c => c.PmsGamme)
            .ThenBy(c => c.PmsType)
            .ToListAsync();

        return categories.Select(ToDto).ToList();
    }

    // ── Availability count for a single category on given dates ────────────────
    // Utilisé par le site public pour bloquer les réservations sur une catégorie
    // dont toutes les chambres sont déjà prises (HS, résa, folio ou block manuel).
    public record CategoryAvailabilityDto(long CategoryId, int Available, int Total);

    public async Task<CategoryAvailabilityDto?> GetAvailabilityAsync(long categoryId, DateOnly checkIn, DateOnly checkOut, int adults)
    {
        var cat = await db.RoomCategories.Include(c => c.Rooms).FirstOrDefaultAsync(c => c.Id == categoryId);
        if (cat is null) return null;

        // Voir GetAvailableAsync : on ne filtre pas sur Status=Available, seulement
        // les états permanents (Inactive, HS). La dispo à une date donnée est déjà
        // gérée par ComputeUnavailableRoomIdsAsync.
        var eligible = cat.Rooms.Where(r =>
            r.Status != RoomStatus.Inactive &&
            !r.HorsService &&
            r.CapacityAdults >= adults);

        var total = eligible.Count();
        if (total == 0) return new CategoryAvailabilityDto(categoryId, 0, 0);

        var unavailable = await ComputeUnavailableRoomIdsAsync(checkIn, checkOut);
        var available   = eligible.Count(r => !unavailable.Contains(r.Id));
        return new CategoryAvailabilityDto(categoryId, available, total);
    }

    // Ids des chambres bloquées sur la fenêtre [checkIn, checkOut) :
    // toute résa (hors annulée/NoShow), tout folio actif (hors annulé/NoShow/clôturé)
    // et tout block manuel qui chevauche la période.
    private async Task<HashSet<long>> ComputeUnavailableRoomIdsAsync(DateOnly checkIn, DateOnly checkOut)
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

        return occupiedRoomIds.Union(blockedRoomIds).Union(folioOccupiedIds).ToHashSet();
    }

    public async Task<RoomCategoryDto?> GetByIdAsync(long id)
    {
        await EnsureImagesSeededAsync();

        var cat = await db.RoomCategories
            .Include(c => c.Rooms)
            .Include(c => c.Images)
            .FirstOrDefaultAsync(c => c.Id == id);
        return cat is null ? null : ToDto(cat);
    }

    public async Task<RoomCategoryDto?> GetBySlugAsync(string slug)
    {
        await EnsureImagesSeededAsync();

        var cat = await db.RoomCategories
            .Include(c => c.Rooms)
            .Include(c => c.Images)
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
        var cat = await db.RoomCategories
            .Include(c => c.Rooms)
            .Include(c => c.Images)
            .FirstOrDefaultAsync(c => c.Id == id);
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

    public async Task<RoomImageDto?> UploadImageAsync(long categoryId, Stream fileStream, string extension, string uploadsRoot)
    {
        if (await db.RoomCategories.FindAsync(categoryId) is null) return null;

        var dir = Path.Combine(uploadsRoot, "categories", categoryId.ToString());
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{extension}";

        await using (var dest = File.Create(Path.Combine(dir, fileName)))
            await fileStream.CopyToAsync(dest);

        var isFirst   = !await db.RoomImages.AnyAsync(i => i.CategoryId == categoryId);
        var sortOrder = await db.RoomImages.CountAsync(i => i.CategoryId == categoryId);

        var image = new RoomImage
        {
            CategoryId = categoryId,
            FilePath   = $"/uploads/categories/{categoryId}/{fileName}",
            SortOrder  = sortOrder,
            IsCover    = isFirst,
        };

        db.RoomImages.Add(image);
        await db.SaveChangesAsync();

        return new RoomImageDto(image.Id, image.FilePath, null, null, image.SortOrder, image.IsCover);
    }

    public async Task<bool> DeleteImageAsync(long categoryId, long imageId, string uploadsRoot)
    {
        var image = await db.RoomImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.CategoryId == categoryId);
        if (image is null) return false;

        if (image.FilePath.StartsWith("/uploads/"))
        {
            var rel      = image.FilePath["/uploads/".Length..];
            var fullPath = Path.Combine(uploadsRoot, rel);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }

        var wasCover = image.IsCover;
        db.RoomImages.Remove(image);
        await db.SaveChangesAsync();

        if (wasCover)
        {
            var next = await db.RoomImages
                .Where(i => i.CategoryId == categoryId)
                .OrderBy(i => i.SortOrder)
                .FirstOrDefaultAsync();
            if (next is not null)
            {
                next.IsCover = true;
                await db.SaveChangesAsync();
            }
        }

        return true;
    }

    public async Task<bool> SetCoverAsync(long categoryId, long imageId)
    {
        var images = await db.RoomImages.Where(i => i.CategoryId == categoryId).ToListAsync();
        if (!images.Any(i => i.Id == imageId)) return false;

        foreach (var img in images)
            img.IsCover = img.Id == imageId;

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderImagesAsync(long categoryId, List<long> imageIds)
    {
        var images = await db.RoomImages.Where(i => i.CategoryId == categoryId).ToListAsync();
        if (images.Count == 0) return false;

        for (int i = 0; i < imageIds.Count; i++)
        {
            var targetId = imageIds[i];
            var img = images.FirstOrDefault(x => x.Id == targetId);
            if (img is not null)
            {
                img.SortOrder = i;
            }
        }

        // If no cover image was designated, default to the first one in the new order
        if (!images.Any(i => i.IsCover) && images.Count > 0)
        {
            var first = images.OrderBy(i => i.SortOrder).First();
            first.IsCover = true;
        }

        await db.SaveChangesAsync();
        return true;
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

    private static RoomCategoryDto ToDto(RoomCategory c)
    {
        var sortedImages = c.Images.OrderBy(i => i.SortOrder).ToList();
        var cover = sortedImages.FirstOrDefault(i => i.IsCover)?.FilePath ?? sortedImages.FirstOrDefault()?.FilePath;

        return new RoomCategoryDto(
            c.Id, c.Slug, c.PmsType, c.PmsGamme,
            c.NameFr, c.NameEn, c.DescriptionFr, c.DescriptionEn,
            c.CapacityAdults, c.CapacityChildren,
            c.TarifNuit, c.TarifN15, c.TarifN30,
            c.Rooms.Count,
            sortedImages.Select(i => new RoomImageDto(i.Id, i.FilePath, i.AltTextFr, i.AltTextEn, i.SortOrder, i.IsCover)).ToList(),
            cover
        );
    }
}

