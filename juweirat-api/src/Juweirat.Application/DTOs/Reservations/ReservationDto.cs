using System.ComponentModel.DataAnnotations;
using Juweirat.Application.DTOs.Prestations;

namespace Juweirat.Application.DTOs.Reservations;

public record ReservationDto(
    long Id,
    string Reference,
    long? RoomId,
    string? RoomNumber,
    string? RoomNameFr,
    string? RoomNameEn,
    long CategoryId,
    string CategorySlug,
    string CategoryNameFr,
    string CategoryNameEn,
    long ClientId,
    string ClientFullName,
    string? ClientEmail,
    string? ClientPhone,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Nights,
    int Adults,
    int Children,
    decimal PricePerNightSnapshot,
    decimal TotalPrice,
    string Currency,
    string Status,
    string? Source,
    string? SpecialRequests,
    string? InternalNotes,
    decimal AmountPaid,
    decimal AmountDue,
    DateTime? ConfirmedAt,
    DateTime? CancelledAt,
    DateTime CreatedAt,
    string? GarantieType,
    decimal? GarantieMontantCash,
    string? CarteNom,
    string? CarteSuffix,
    string? CarteExpiration,
    decimal TotalHebergement,
    decimal TotalPrestations,
    List<ReservationPrestationDto> Prestations,
    bool TvaExonere = false,
    int Discount = 0
);

public record CreateReservationRequest(
    [Required] long CategoryId,
    [Required] long ClientId,
    [Required] DateOnly CheckInDate,
    [Required] DateOnly CheckOutDate,
    long? RoomId = null,
    [Range(1, 20)] int Adults = 1,
    [Range(0, 10)] int Children = 0,
    string Currency = "XOF",
    string? Source = "website",
    string? SpecialRequests = null,
    string? InternalNotes = null,
    string? GarantieType = null,
    decimal? GarantieMontantCash = null,
    string? CarteNom = null,
    string? CarteSuffix = null,
    string? CarteExpiration = null,
    List<PrestationLigneRequest>? Prestations = null,
    bool TvaExonere = false,
    int Discount = 0
);

public record UpdateReservationStatusRequest(
    [Required] string Status,
    string? InternalNotes = null,
    string? CancellationReason = null
);

// For public website availability check
public record AvailabilityRequest(
    [Required] DateOnly CheckInDate,
    [Required] DateOnly CheckOutDate,
    int Adults = 1,
    int Children = 0
);

public record NoShowBillingResultDto(
    long ReservationId,
    int PenaltyNights,
    decimal PenaltyAmount,
    string Currency,
    ReservationDto Reservation
);

// Aperçu sans effet de bord — utilisé pour afficher le montant de retenue
// dans le popup avant que l'opérateur ne choisisse le mode de paiement.
public record NoShowPreviewDto(
    long ReservationId,
    string Reference,
    string GuestName,
    int PenaltyNights,
    decimal PenaltyAmount,
    string Currency,
    bool AlreadyBilled
);

public record CancellationBillingResultDto(
    long ReservationId,
    int PenaltyNights,     // 0 if cancellation is free
    decimal PenaltyAmount,
    string Currency,
    string DeadlineLabel,  // Human-readable deadline that applied (or was passed)
    ReservationDto Reservation
);

public record TarifPreviewDto(
    int PricePerNight,     // tarif effectivement appliqué selon la durée
    int TarifNuit,
    int TarifN15,
    int TarifN30,
    string Tier,           // "Nuitee" | "N15Nuits" | "N30Nuits"
    string Source,         // "company" | "category"
    string? CompanyName,   // libellé si tarif compagnie appliqué
    int TotalHebergement
);

public record UpdateReservationRequest(
    string? Source                = null,
    string? SpecialRequests       = null,
    string? InternalNotes         = null,
    int? Adults                   = null,
    int? Children                 = null,
    string? GarantieType          = null,
    decimal? GarantieMontantCash  = null,
    string? CarteNom              = null,
    string? CarteSuffix           = null,
    string? CarteExpiration       = null,
    // Édition du séjour : dates, catégorie, chambre. Déclenchent un recalcul tarif waterfall.
    long? CategoryId              = null,
    long? RoomId                  = null,
    DateOnly? CheckInDate         = null,
    DateOnly? CheckOutDate        = null,
    // Prestations : si non null, remplace la liste actuelle (delete-then-add).
    List<PrestationLigneRequest>? Prestations = null,
    // Confirmation explicite requise si le nouveau total est inférieur à AmountPaid.
    bool AcceptRefundImbalance    = false,
    // Exonération TVA (bool? = pas de modification si null).
    bool? TvaExonere              = null,
    // Remise en FCFA — null pas de modification. 0 pour retirer la remise.
    int? Discount                 = null
);
