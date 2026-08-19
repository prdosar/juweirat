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
    List<AmenityDto> Amenities,
    RoomOccupationDto? CurrentOccupation = null
);

/// <summary>Résa qui couvre la journée courante (client + jusqu'à quelle date).</summary>
public record RoomOccupationDto(
    long ReservationId,
    string Reference,
    string ClientName,
    string? CompanyName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    string Status
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
