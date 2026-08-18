using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Pms;

public record MaintenanceCategoryDto(
    long Id,
    string Name,
    bool IsActive,
    int StaffCount
);

public record MaintenanceStaffDto(
    long Id,
    long CategoryId,
    string CategoryName,
    string FirstName,
    string LastName,
    string? Phone,
    bool IsActive,
    string FullName
);

public record CreateMaintenanceCategoryRequest(
    [Required] string Name
);

public record UpdateMaintenanceCategoryRequest(
    string? Name = null,
    bool? IsActive = null
);

public record CreateMaintenanceStaffRequest(
    [Required] long CategoryId,
    [Required] string FirstName,
    [Required] string LastName,
    string? Phone = null
);

public record UpdateMaintenanceStaffRequest(
    long? CategoryId = null,
    string? FirstName = null,
    string? LastName = null,
    string? Phone = null,
    bool? IsActive = null
);
