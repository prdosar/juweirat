using Juweirat.Domain.Enums;

namespace Juweirat.Application.DTOs.Rooms;

public record RoomDto(
    long Id,
    string RoomNumber,
    int Floor,
    string NameFr,
    string NameEn,
    string? DescriptionFr,
    string? DescriptionEn,
    int CapacityAdults,
    int CapacityChildren,
    decimal? SizeSqm,
    decimal PricePerNight,
    decimal? PricePerWeek,
    decimal? PricePerMonth,
    string Status,
    bool IsFeatured,
    long? CategoryId,
    string? CategorySlug,
    string? PmsType,
    string? PmsGamme,
    List<RoomImageDto> Images,
    List<AmenityDto> Amenities
);

public record RoomImageDto(
    long Id,
    string FilePath,
    string? AltTextFr,
    string? AltTextEn,
    int SortOrder,
    bool IsCover
);

public record AmenityDto(
    long Id,
    string NameFr,
    string NameEn,
    string? Icon
);
