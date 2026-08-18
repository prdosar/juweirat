using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Ventes;

public record VenteDirecteDto(
    long Id,
    long PrestationId,
    string PrestationNameFr,
    string? PrestationIcon,
    long? ClientId,
    string? ClientNom,
    long? FolioId,
    string? FolioNumber,
    string? RoomNumber,
    int Quantite,
    decimal PrixUnitaireSnapshot,
    decimal Total,
    string Mode,
    string? PaymentMethod,
    string? Notes,
    DateTime CreatedAt
);

public record CreateVenteDirecteRequest(
    [Required][Range(1, long.MaxValue)] long PrestationId,
    [Range(1, 999)] int Quantite = 1,
    long? ClientId = null,
    string? ClientNom = null,
    long? FolioId = null,
    string Mode = "Encaissement",
    string? PaymentMethod = null,
    string? Notes = null
);

public record FolioActifDto(
    long FolioId,
    string FolioNumber,
    string RoomNumber,
    string? GuestName
);
