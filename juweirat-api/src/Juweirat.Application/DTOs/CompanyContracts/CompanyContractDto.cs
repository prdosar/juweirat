using System.ComponentModel.DataAnnotations;
using Juweirat.Application.Common.Pagination;

namespace Juweirat.Application.DTOs.CompanyContracts;

public record CompanyContractDto(
    long Id,
    string Reference,
    long CompanyId,
    string CompanyName,
    long RoomId,
    string RoomNumber,
    string? RoomNameFr,
    DateOnly StartDate,
    DateOnly EndDate,
    int MonthlyRate,
    string Status,
    bool TvaExonere,
    bool ElecIncluded,
    string? Notes,
    int OccupantCount,
    DateTime CreatedAt
);

public record CompanyContractDetailDto(
    long Id,
    string Reference,
    long CompanyId,
    string CompanyName,
    long RoomId,
    string RoomNumber,
    string? RoomNameFr,
    DateOnly StartDate,
    DateOnly EndDate,
    int MonthlyRate,
    string Status,
    bool TvaExonere,
    bool ElecIncluded,
    string? Notes,
    DateTime CreatedAt,
    List<ContractOccupantDto> Occupants
);

public record ContractOccupantDto(
    long ReservationId,
    string Reference,
    long ClientId,
    string ClientFullName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Nights,
    string Status
);

public record CreateCompanyContractRequest(
    [Required] long CompanyId,
    [Required] long RoomId,
    [Required] DateOnly StartDate,
    [Required] DateOnly EndDate,
    [Range(0, int.MaxValue)] int MonthlyRate,
    bool TvaExonere,
    bool ElecIncluded,
    string? Notes
);

public record UpdateCompanyContractRequest(
    DateOnly? EndDate,
    int? MonthlyRate,
    bool? TvaExonere,
    bool? ElecIncluded,
    string? Notes
);

public class CompanyContractFilterParams : PaginationParams
{
    public long? CompanyId { get; set; }
    public long? RoomId { get; set; }
    public string? Status { get; set; } // Active | Ended | Cancelled
    public bool? ActiveOn { get; set; } // true = filtrer les contrats couvrant aujourd'hui
}
