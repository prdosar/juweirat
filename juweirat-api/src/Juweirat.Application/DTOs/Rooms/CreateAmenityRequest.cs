using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Rooms;

public record CreateAmenityRequest(
    [Required] string NameFr,
    [Required] string NameEn,
    string? Icon = null
);
