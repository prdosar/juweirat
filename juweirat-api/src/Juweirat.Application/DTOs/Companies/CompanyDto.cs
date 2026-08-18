using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Companies;

public record CompanyDto(
    long Id,
    string Name,
    string? ResponsableNom,
    string? Phone,
    string? Email,
    string? Adresse,
    string? Ville,
    string? Notes,
    bool IsActive,
    int ClientCount,
    DateTime CreatedAt
);

public record CompanyDetailDto(
    long Id,
    string Name,
    string? ResponsableNom,
    string? Phone,
    string? Email,
    string? Adresse,
    string? Ville,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    List<CompanyClientDto> Clients,
    List<CompanyTarifDto> Tarifs
);

public record CompanyClientDto(
    long Id,
    string FullName,
    string? Email,
    string? Phone
);

public record CompanyTarifDto(
    long Id,
    long CategoryId,
    string CategoryNameFr,
    string CategorySlug,
    int TarifNuit,
    int TarifN15,
    int TarifN30
);

public record CreateCompanyRequest(
    [Required] string Name,
    string? ResponsableNom,
    string? Phone,
    string? Email,
    string? Adresse,
    string? Ville,
    string? Notes
);

public record UpdateCompanyRequest(
    string? Name,
    string? ResponsableNom,
    string? Phone,
    string? Email,
    string? Adresse,
    string? Ville,
    string? Notes,
    bool? IsActive
);

public record SetCompanyTarifRequest(
    [Required] long CategoryId,
    [Range(0, int.MaxValue)] int TarifNuit,
    [Range(0, int.MaxValue)] int TarifN15,
    [Range(0, int.MaxValue)] int TarifN30
);

public record AssignClientRequest(
    [Required] long ClientId
);

public record CompanyStayDto(
    long ReservationId,
    string Reference,
    long ClientId,
    string ClientFullName,
    long? RoomId,
    string? RoomNumber,
    string? RoomNameFr,
    long CategoryId,
    string CategoryNameFr,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Nights,
    int NightsInPeriod,
    string Status
);
