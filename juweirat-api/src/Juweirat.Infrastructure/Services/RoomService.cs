using Juweirat.Application.DTOs.Rooms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Services;

public class RoomService(AppDbContext db)
{
    public async Task<List<RoomDto>> GetAllAsync(string? status = null, int? floor = null)
    {
        var query = db.Rooms
            .Include(r => r.Images.OrderBy(i => i.SortOrder))
            .Include(r => r.Amenities)
            .AsQueryable();

        if (status is not null && Enum.TryParse<RoomStatus>(status, true, out var s))
            query = query.Where(r => r.Status == s);

        if (floor is not null)
            query = query.Where(r => r.Floor == floor);

        var rooms = await query.OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber).ToListAsync();
        return rooms.Select(ToDto).ToList();
    }

    public async Task<RoomDto?> GetByIdAsync(long id)
    {
        var room = await db.Rooms
            .Include(r => r.Images.OrderBy(i => i.SortOrder))
            .Include(r => r.Amenities)
            .FirstOrDefaultAsync(r => r.Id == id);
        return room is null ? null : ToDto(room);
    }

    public async Task<RoomDto> CreateAsync(CreateRoomRequest req)
    {
        var room = new Room
        {
            RoomNumber       = req.RoomNumber,
            Floor            = req.Floor,
            NameFr           = req.NameFr,
            NameEn           = req.NameEn,
            DescriptionFr    = req.DescriptionFr,
            DescriptionEn    = req.DescriptionEn,
            CapacityAdults   = req.CapacityAdults,
            CapacityChildren = req.CapacityChildren,
            SizeSqm          = req.SizeSqm,
            PricePerNight    = req.PricePerNight,
            PricePerWeek     = req.PricePerWeek,
            PricePerMonth    = req.PricePerMonth,
        };

        if (req.AmenityIds?.Count > 0)
        {
            var amenities = await db.Amenities
                .Where(a => req.AmenityIds.Contains(a.Id))
                .ToListAsync();
            room.Amenities = amenities;
        }

        db.Rooms.Add(room);
        await db.SaveChangesAsync();

        return ToDto(room);
    }

    public async Task<RoomDto?> UpdateAsync(long id, UpdateRoomRequest req)
    {
        var room = await db.Rooms
            .Include(r => r.Images)
            .Include(r => r.Amenities)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (room is null) return null;

        if (req.RoomNumber is not null)    room.RoomNumber       = req.RoomNumber;
        if (req.Floor is not null)         room.Floor            = req.Floor.Value;
        if (req.NameFr is not null)        room.NameFr           = req.NameFr;
        if (req.NameEn is not null)        room.NameEn           = req.NameEn;
        if (req.DescriptionFr is not null) room.DescriptionFr    = req.DescriptionFr;
        if (req.DescriptionEn is not null) room.DescriptionEn    = req.DescriptionEn;
        if (req.CapacityAdults is not null)   room.CapacityAdults   = req.CapacityAdults.Value;
        if (req.CapacityChildren is not null) room.CapacityChildren = req.CapacityChildren.Value;
        if (req.SizeSqm is not null)       room.SizeSqm          = req.SizeSqm;
        if (req.PricePerNight is not null) room.PricePerNight    = req.PricePerNight.Value;
        if (req.PricePerWeek is not null)  room.PricePerWeek     = req.PricePerWeek;
        if (req.PricePerMonth is not null) room.PricePerMonth    = req.PricePerMonth;
        if (req.IsFeatured is not null)    room.IsFeatured       = req.IsFeatured.Value;

        if (req.Status is not null && Enum.TryParse<RoomStatus>(req.Status, true, out var s))
            room.Status = s;

        if (req.AmenityIds is not null)
        {
            var amenities = await db.Amenities
                .Where(a => req.AmenityIds.Contains(a.Id))
                .ToListAsync();
            room.Amenities = amenities;
        }

        await db.SaveChangesAsync();
        return ToDto(room);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var room = await db.Rooms.FindAsync(id);
        if (room is null) return false;
        db.Rooms.Remove(room);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Images ────────────────────────────────────────────────────────────────

    public async Task<RoomImageDto?> UploadImageAsync(long roomId, IFormFile file, string uploadsRoot)
    {
        if (await db.Rooms.FindAsync(roomId) is null) return null;

        var dir = Path.Combine(uploadsRoot, "rooms", roomId.ToString());
        Directory.CreateDirectory(dir);

        var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid()}{ext}";

        await using (var stream = File.Create(Path.Combine(dir, fileName)))
            await file.CopyToAsync(stream);

        var isFirst   = !await db.RoomImages.AnyAsync(i => i.RoomId == roomId);
        var sortOrder = await db.RoomImages.CountAsync(i => i.RoomId == roomId);

        var image = new RoomImage
        {
            RoomId    = roomId,
            FilePath  = $"/uploads/rooms/{roomId}/{fileName}",
            SortOrder = sortOrder,
            IsCover   = isFirst,
        };

        db.RoomImages.Add(image);
        await db.SaveChangesAsync();

        return new RoomImageDto(image.Id, image.FilePath, null, null, image.SortOrder, image.IsCover);
    }

    public async Task<bool> DeleteImageAsync(long roomId, long imageId, string uploadsRoot)
    {
        var image = await db.RoomImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.RoomId == roomId);
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
                .Where(i => i.RoomId == roomId)
                .OrderBy(i => i.SortOrder)
                .FirstOrDefaultAsync();
            if (next is not null) { next.IsCover = true; await db.SaveChangesAsync(); }
        }

        return true;
    }

    public async Task<bool> SetCoverAsync(long roomId, long imageId)
    {
        var images = await db.RoomImages.Where(i => i.RoomId == roomId).ToListAsync();
        if (!images.Any(i => i.Id == imageId)) return false;
        foreach (var img in images) img.IsCover = img.Id == imageId;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<RoomDto>> GetAvailableAsync(DateOnly checkIn, DateOnly checkOut, int adults)
    {
        var occupiedRoomIds = await db.Reservations
            .Where(r =>
                r.Status != ReservationStatus.Cancelled &&
                r.Status != ReservationStatus.NoShow &&
                r.CheckInDate  < checkOut &&
                r.CheckOutDate > checkIn)
            .Select(r => r.RoomId)
            .ToListAsync();

        var blockedRoomIds = await db.RoomBlocks
            .Where(b => b.StartDate < checkOut && b.EndDate > checkIn)
            .Select(b => b.RoomId)
            .ToListAsync();

        var unavailable = occupiedRoomIds.Union(blockedRoomIds).ToHashSet();

        var rooms = await db.Rooms
            .Include(r => r.Images.OrderBy(i => i.SortOrder))
            .Include(r => r.Amenities)
            .Where(r =>
                r.Status == RoomStatus.Available &&
                r.CapacityAdults >= adults &&
                !unavailable.Contains(r.Id))
            .OrderBy(r => r.Floor)
            .ToListAsync();

        return rooms.Select(ToDto).ToList();
    }

    private static RoomDto ToDto(Room r) => new(
        r.Id, r.RoomNumber, r.Floor,
        r.NameFr, r.NameEn, r.DescriptionFr, r.DescriptionEn,
        r.CapacityAdults, r.CapacityChildren, r.SizeSqm,
        r.PricePerNight, r.PricePerWeek, r.PricePerMonth,
        r.Status.ToString(),
        r.IsFeatured,
        r.Images.Select(i => new RoomImageDto(i.Id, i.FilePath, i.AltTextFr, i.AltTextEn, i.SortOrder, i.IsCover)).ToList(),
        r.Amenities.Select(a => new AmenityDto(a.Id, a.NameFr, a.NameEn, a.Icon)).ToList()
    );
}
