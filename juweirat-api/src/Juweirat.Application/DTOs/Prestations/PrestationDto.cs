using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Prestations;

public record PrestationAnnexeDto(
    long Id,
    string NameFr,
    string NameEn,
    string? Icon,
    string Mode,
    decimal PrixInclus,
    decimal PrixSeule,
    bool IsActive,
    int SortOrder,
    bool PrixFlexible = false
);

public record CreatePrestationRequest(
    [Required] string NameFr,
    [Required] string NameEn,
    string? Icon = null,
    string Mode = "ParPersonneParNuit",
    [Range(0, 9999999)] decimal PrixInclus = 0,
    [Range(0, 9999999)] decimal PrixSeule = 0,
    int SortOrder = 0,
    bool PrixFlexible = false
);

public record UpdatePrestationRequest(
    string? NameFr = null,
    string? NameEn = null,
    string? Icon = null,
    string? Mode = null,
    decimal? PrixInclus = null,
    decimal? PrixSeule = null,
    bool? IsActive = null,
    int? SortOrder = null,
    bool? PrixFlexible = null
);

// Ce qu'on envoie depuis le formulaire de réservation.
// PrixUnitaire est optionnel : requis uniquement quand la prestation est flexible,
// ignoré sinon (le catalogue prime).
public record PrestationLigneRequest(
    [Required] long PrestationId,
    [Range(1, 9999)] int Quantite,
    decimal? PrixUnitaire = null
);

// Ce qu'on renvoie dans le DTO de réservation
public record ReservationPrestationDto(
    long Id,
    long PrestationId,
    string NameFr,
    string NameEn,
    string? Icon,
    string Mode,
    int Quantite,
    decimal PrixUnitaireSnapshot,
    decimal TotalLigne
);

// Ligne de consommation d'une prestation sur une période donnée (source réservation ou vente directe).
public record PrestationConsumptionDto(
    string Source,             // "Reservation" | "VenteDirecte"
    long SourceId,
    string? Reference,
    DateOnly Date,
    long? ClientId,
    string? ClientName,
    long? RoomId,
    string? RoomNumber,
    string? RoomNameFr,
    int Quantite,
    decimal PrixUnitaireSnapshot,
    decimal Total
);
