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
    // Tarifs journaliers proxyés depuis la RoomCategory liée (0 si non rattachée).
    int TarifNuit,
    int TarifN15,
    int TarifN30,
    string Status,
    bool IsFeatured,
    long? CategoryId,
    string? CategorySlug,
    string? PmsType,
    string? PmsGamme,
    List<RoomImageDto> Images,
    List<AmenityDto> Amenities,
    RoomOccupationDto? CurrentOccupation = null,
    // Contrat compagnie actif couvrant aujourd'hui (indépendant de l'occupation).
    // Peut être présent avec CurrentOccupation = null (chambre sous contrat, sans occupant du jour).
    RoomContractDto? CurrentContract = null
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

/// <summary>Contrat compagnie actif couvrant la journée courante sur la chambre.</summary>
public record RoomContractDto(
    long ContractId,
    string Reference,
    string CompanyName,
    DateOnly StartDate,
    DateOnly EndDate
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
