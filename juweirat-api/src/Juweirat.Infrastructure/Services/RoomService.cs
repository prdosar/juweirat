using Juweirat.Application.DTOs.Rooms;
using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Juweirat.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using FolioStatus = Juweirat.Domain.Enums.FolioResaStatus;

namespace Juweirat.Infrastructure.Services;

public class RoomService(AppDbContext db)
{
    public async Task<List<RoomDto>> GetAllAsync(string? status = null, int? floor = null)
    {
        var query = db.Rooms
            .Include(r => r.Images.OrderBy(i => i.SortOrder))
            .Include(r => r.Amenities)
            .Include(r => r.Category)
            .AsQueryable();

        if (status is not null && Enum.TryParse<RoomStatus>(status, true, out var s))
            query = query.Where(r => r.Status == s);

        if (floor is not null)
            query = query.Where(r => r.Floor == floor);

        var rooms = await query.OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber).ToListAsync();
        var occupations = await LoadCurrentOccupationsAsync(rooms.Select(r => r.Id).ToList());
        return rooms.Select(r => ToDto(r, occupations.GetValueOrDefault(r.Id))).ToList();
    }

    public async Task<RoomDto?> GetByIdAsync(long id)
    {
        var room = await db.Rooms
            .Include(r => r.Images.OrderBy(i => i.SortOrder))
            .Include(r => r.Amenities)
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (room is null) return null;
        var occupations = await LoadCurrentOccupationsAsync(new List<long> { room.Id });
        return ToDto(room, occupations.GetValueOrDefault(room.Id));
    }

    /// <summary>
    /// Pour chaque roomId fourni, renvoie la réservation "active" qui couvre la journée
    /// courante (checkIn ≤ today AND checkOut > today, statuts non-terminés).
    /// </summary>
    private async Task<Dictionary<long, RoomOccupationDto>> LoadCurrentOccupationsAsync(List<long> roomIds)
    {
        if (roomIds.Count == 0) return new();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var resas = await db.Reservations
            .Include(r => r.Client).ThenInclude(c => c!.Company)
            .Where(r =>
                r.RoomId != null && roomIds.Contains(r.RoomId.Value) &&
                r.Status != ReservationStatus.Cancelled &&
                r.Status != ReservationStatus.NoShow &&
                r.Status != ReservationStatus.CheckedOut &&
                r.CheckInDate  <= today &&
                r.CheckOutDate  > today)
            .ToListAsync();

        var dict = new Dictionary<long, RoomOccupationDto>();
        foreach (var r in resas)
        {
            dict[r.RoomId!.Value] = new RoomOccupationDto(
                r.Id, r.Reference,
                r.Client.FullName,
                r.Client.Company?.Name,
                r.CheckInDate, r.CheckOutDate,
                r.Status.ToString()
            );
        }
        return dict;
    }

    public async Task<RoomDto> CreateAsync(CreateRoomRequest req)
    {
        // Les prix ont été centralisés sur RoomCategory — Room ne stocke plus de tarif.
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
            PmsRoomNo        = req.RoomNumber,
            StatutMenage     = MenageStatus.Propre,
            HorsService      = false,
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

        if (req.RoomNumber is not null)
        {
            room.RoomNumber = req.RoomNumber;
            if (string.IsNullOrEmpty(room.PmsRoomNo)) room.PmsRoomNo = req.RoomNumber;
        }
        if (req.Floor is not null)         room.Floor            = req.Floor.Value;
        if (req.NameFr is not null)        room.NameFr           = req.NameFr;
        if (req.NameEn is not null)        room.NameEn           = req.NameEn;
        if (req.DescriptionFr is not null) room.DescriptionFr    = req.DescriptionFr;
        if (req.DescriptionEn is not null) room.DescriptionEn    = req.DescriptionEn;
        if (req.CapacityAdults is not null)   room.CapacityAdults   = req.CapacityAdults.Value;
        if (req.CapacityChildren is not null) room.CapacityChildren = req.CapacityChildren.Value;
        if (req.SizeSqm is not null)       room.SizeSqm          = req.SizeSqm;
        // Les prix ne sont plus modifiables au niveau chambre — passer par la catégorie.
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

        if (req.CategoryId is not null)
        {
            var category = await db.RoomCategories.FirstOrDefaultAsync(c => c.Id == req.CategoryId.Value);
            if (category is null)
                throw new InvalidOperationException($"Catégorie introuvable (id={req.CategoryId.Value})");
            room.CategoryId = category.Id;
            room.Category   = category;
            room.PmsType    = category.PmsType;
            room.PmsGamme   = category.PmsGamme;
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

    public async Task<RoomImageDto?> UploadImageAsync(long roomId, Stream fileStream, string extension, string uploadsRoot)
    {
        if (await db.Rooms.FindAsync(roomId) is null) return null;

        var dir = Path.Combine(uploadsRoot, "rooms", roomId.ToString());
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{extension}";

        await using (var dest = File.Create(Path.Combine(dir, fileName)))
            await fileStream.CopyToAsync(dest);

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

    public async Task<List<RoomDto>> GetAvailableAsync(DateOnly checkIn, DateOnly checkOut, int adults, long? excludeReservationId = null)
    {
        // Réservations web bloquant les créneaux (auto-exclusion pour l'édition inplace).
        var occupiedRoomIds = await db.Reservations
            .Where(r =>
                r.Status != ReservationStatus.Cancelled &&
                r.Status != ReservationStatus.NoShow &&
                r.RoomId != null &&
                r.CheckInDate  < checkOut &&
                r.CheckOutDate > checkIn &&
                (excludeReservationId == null || r.Id != excludeReservationId.Value))
            .Select(r => r.RoomId!.Value)
            .ToListAsync();

        // Blocages manuels
        var blockedRoomIds = await db.RoomBlocks
            .Where(b => b.StartDate < checkOut && b.EndDate > checkIn)
            .Select(b => b.RoomId)
            .ToListAsync();

        // Folios PMS actifs sur le même créneau — quand une résa est liée, elle EST
        // la source de vérité (chambre, dates). Sinon (folio walk-in), on lit sur les
        // colonnes propres au folio. Cette projection rend le check tolérant à toute
        // drift historique entre folio et résa. Cf. [[project-architecture]].
        var folioOccupiedIds = await db.Folios
            .Where(f =>
                f.ResaStatus != FolioStatus.Annulee &&
                f.ResaStatus != FolioStatus.NoShow &&
                !f.Closed &&
                (excludeReservationId == null || f.ReservationId != excludeReservationId.Value) &&
                (f.Reservation != null
                    ? f.Reservation.CheckInDate  < checkOut && f.Reservation.CheckOutDate > checkIn
                    : f.Arrival < checkOut && f.Departure > checkIn))
            .Select(f =>
                f.Reservation != null && f.Reservation.RoomId != null
                    ? f.Reservation.RoomId.Value
                    : f.UnitId)
            .ToListAsync();

        var unavailable = occupiedRoomIds
            .Union(blockedRoomIds)
            .Union(folioOccupiedIds)
            .ToHashSet();

        // Voir RoomCategoryService.GetAvailableAsync : Status=Available est un état
        // instantané, on ne l'utilise pas pour filtrer. Seuls Inactive et HS excluent.
        var rooms = await db.Rooms
            .Include(r => r.Images.OrderBy(i => i.SortOrder))
            .Include(r => r.Amenities)
            .Include(r => r.Category)
            .Where(r =>
                r.Status != RoomStatus.Inactive &&
                !r.HorsService &&
                r.CapacityAdults >= adults &&
                !unavailable.Contains(r.Id))
            .OrderBy(r => r.Floor)
            .ToListAsync();

        return rooms.Select(r => ToDto(r)).ToList();
    }

    private static RoomDto ToDto(Room r, RoomOccupationDto? occupation = null) => new(
        r.Id, r.RoomNumber, r.Floor,
        r.NameFr, r.NameEn, r.DescriptionFr, r.DescriptionEn,
        r.CapacityAdults, r.CapacityChildren, r.SizeSqm,
        // Tarifs journaliers proxyés depuis la Category rattachée.
        r.Category?.TarifNuit ?? 0,
        r.Category?.TarifN15  ?? 0,
        r.Category?.TarifN30  ?? 0,
        r.Status.ToString(),
        r.IsFeatured,
        r.CategoryId, r.Category?.Slug, r.PmsType, r.PmsGamme,
        r.Images.Select(i => new RoomImageDto(i.Id, i.FilePath, i.AltTextFr, i.AltTextEn, i.SortOrder, i.IsCover)).ToList(),
        r.Amenities.Select(a => new AmenityDto(a.Id, a.NameFr, a.NameEn, a.Icon)).ToList(),
        occupation
    );
}
