using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Rooms;

public record CreateRoomRequest(
    [Required] string RoomNumber,
    [Required, Range(1, 20)] int Floor,
    [Required] string NameFr,
    [Required] string NameEn,
    string? DescriptionFr,
    string? DescriptionEn,
    [Range(1, 20)] int CapacityAdults = 2,
    [Range(0, 10)] int CapacityChildren = 1,
    decimal? SizeSqm = null,
    List<long>? AmenityIds = null
);

// Les tarifs sont gérés au niveau RoomCategory — pas de prix dans le create/update Room.
public record UpdateRoomRequest(
    string? RoomNumber,
    int? Floor,
    string? NameFr,
    string? NameEn,
    string? DescriptionFr,
    string? DescriptionEn,
    int? CapacityAdults,
    int? CapacityChildren,
    decimal? SizeSqm,
    string? Status,
    bool? IsFeatured,
    List<long>? AmenityIds,
    long? CategoryId = null
);
