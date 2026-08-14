namespace Juweirat.Application.DTOs.Rooms;

public record RoomCategoryDto(
    long Id,
    string Slug,
    string PmsType,
    string PmsGamme,
    string NameFr,
    string NameEn,
    string? DescriptionFr,
    string? DescriptionEn,
    int CapacityAdults,
    int CapacityChildren,
    int TarifNuit,
    int TarifN15,
    int TarifN30,
    int RoomCount
);

public record CreateRoomCategoryRequest(
    string PmsType,
    string PmsGamme,
    string NameFr,
    string NameEn,
    string? DescriptionFr,
    string? DescriptionEn,
    int CapacityAdults,
    int CapacityChildren,
    int TarifNuit,
    int TarifN15,
    int TarifN30
);
