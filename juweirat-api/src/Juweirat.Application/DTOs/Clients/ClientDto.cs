using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Clients;

public record ClientDto(
    long Id,
    string FirstName,
    string LastName,
    string FullName,
    string? Email,
    string? Phone,
    string? Nationality,
    string? DocumentType,
    string? DocumentNumber,
    string? City,
    string? Country,
    string? Notes,
    int TotalReservations,
    DateTime CreatedAt,
    long? CompanyId = null,
    string? CompanyName = null
);

public record CreateClientRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [EmailAddress] string? Email,
    string? Phone,
    string? Nationality,
    string? DocumentType,
    string? DocumentNumber,
    string? City,
    string? Country,
    string? Notes,
    long? CompanyId = null
);

public record UpdateClientRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? Nationality,
    string? DocumentType,
    string? DocumentNumber,
    string? City,
    string? Country,
    string? Notes,
    long? CompanyId = null
);
