using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Pms;

public record MaintenanceTicketDto(
    long Id,
    string Zone,
    long? UnitId,
    string? UnitLabel,
    string? Spot,
    string Category,
    string Priority,
    string Title,
    string? Description,
    string? Tech,
    int? Cost,
    string Status,
    DateTime? ResolvedAt,
    string? Note,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long? StaffId = null,
    string? StaffNom = null,
    string? StaffPhone = null
);

public record CreateMaintenanceRequest(
    string Zone = "logement",
    long? UnitId = null,
    string? Spot = null,
    string Category = "Autre",
    string Priority = "Normale",
    [Required] string Title = "",
    string? Description = null,
    string? Tech = null,
    long? StaffId = null,
    int? Cost = null,
    string? Note = null
);

public record UpdateMaintenanceRequest(
    string? Zone = null,
    long? UnitId = null,
    string? Spot = null,
    string? Category = null,
    string? Priority = null,
    string? Title = null,
    string? Description = null,
    string? Tech = null,
    long? StaffId = null,
    int? Cost = null,
    string? Status = null,
    string? Note = null
);
