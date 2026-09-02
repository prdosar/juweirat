using System.ComponentModel.DataAnnotations;

namespace Juweirat.Application.DTOs.Pms;

public record HotelConfigDto(
    int Id,
    string BuildingName,
    string OwnerName,
    string City,
    string CurrencyCode,
    int CurrencyDecimals,
    DateOnly DateHotel,
    int ResaSeq,
    int FactureSeq
);

public record UpdateHotelConfigRequest(
    string? BuildingName = null,
    string? OwnerName = null,
    string? City = null,
    string? CurrencyCode = null,
    int? CurrencyDecimals = null,
    DateOnly? DateHotel = null
);

public record UnitDto(
    long Id,
    string? PmsRoomNo,
    string? PmsType,
    string? PmsGamme,
    int TarifNuit,
    int TarifN15,
    int TarifN30,
    string StatutMenage,
    DateOnly? LastCleaned,
    bool HorsService,
    int Floor,
    int PlanCol,
    int PlanRow,
    string NameFr,
    string NameEn,
    string? CurrentFolioNumber,
    // Occupant courant — source de vérité : réservation liée (Client + Company).
    // Fallback sur folio.Guest / folio.Societe pour les folios walk-in sans résa.
    string? CurrentGuestName,
    string? CurrentCompanyName
);

public record PatchMenageRequest(
    [Required] string StatutMenage,   // Propre | Sale
    long? StaffId = null,             // requis quand StatutMenage=Propre
    string? Notes = null
);
public record PatchHorsServiceRequest([Required] bool HorsService);

public record HousekeepingLogDto(
    long Id,
    long RoomId,
    long StaffId,
    string StaffFullName,
    string? StaffPhone,
    DateTime CleanedAt,
    string? Notes
);

public record RoomHistoryDto(
    List<HousekeepingLogDto> Housekeeping,
    List<MaintenanceTicketDto> Maintenance
);

public record FolioDto(
    long Id,
    string Number,
    long UnitId,
    string UnitLabel,
    string? Guest,
    string? Nom,
    string? Prenom,
    string? Societe,
    string? Reservataire,
    string? CardNumber,
    string? CardExpiry,
    string? CardHolder,
    string Segment,
    int Pax,
    DateOnly Arrival,
    DateOnly Departure,
    int Nights,
    int Rate,
    int Heb,
    string TarifTier,
    bool ElecIncluded,
    int PdjParJour,
    int PdjPrix,
    int Debiteur,
    int Dependances,
    int Arrhes,
    int Paid,
    string? PayMode,
    string? FactRecipient,
    string ResaStatus,
    bool CheckedIn,
    bool Closed,
    DateOnly? CheckoutDate,
    string? Note,
    long? ReservationId,
    string? ReservationReference,
    long? FactureId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // Computed financials — TOTAUX EN HT, sauf Solde et TotalTtc qui sont TTC.
    // Convention prix HT : Rate, PdjPrix, Debiteur, Dependances sont stockés HT ;
    // la TVA est ajoutée à l'affichage/impression.
    int TotalHeb,
    int TotalPdj,
    int TotalDebiteur,
    int TotalDependances,
    int TotalGeneral,
    int Solde,
    bool TvaExonere = false,
    int Tva = 0,
    int TotalTtc = 0,
    // Décomposition catalogue → remise → net, remontée depuis la Reservation
    // liée quand elle existe (source unique de vérité prix). Pour un folio direct
    // PMS sans résa liée, TotalHebGross = TotalHeb et Discount = 0.
    int TotalHebGross = 0,
    int Discount = 0,
    int TotalPrestations = 0
);

public record CreateFolioRequest(
    [Required] long UnitId,
    string? Nom = null,
    string? Prenom = null,
    string? Societe = null,
    string? Reservataire = null,
    string? CardNumber = null,
    string? CardExpiry = null,
    string? CardHolder = null,
    string Segment = "Direct",
    int Pax = 1,
    DateOnly? Arrival = null,
    DateOnly? Departure = null,
    int Rate = 0,
    int Heb = 0,
    int PdjParJour = 0,
    int PdjPrix = 0,
    int Debiteur = 0,
    int Dependances = 0,
    int Arrhes = 0,
    string? PayMode = null,
    string? FactRecipient = null,
    string ResaStatus = "Confirmee",
    string? Note = null
);

public record UpdateFolioRequest(
    string? Nom = null,
    string? Prenom = null,
    string? Societe = null,
    string? Reservataire = null,
    string? CardNumber = null,
    string? CardExpiry = null,
    string? CardHolder = null,
    string? Segment = null,
    int? Pax = null,
    DateOnly? Arrival = null,
    DateOnly? Departure = null,
    int? Rate = null,
    int? Heb = null,
    int? PdjParJour = null,
    int? PdjPrix = null,
    int? Debiteur = null,
    int? Dependances = null,
    int? Arrhes = null,
    string? PayMode = null,
    string? FactRecipient = null,
    string? ResaStatus = null,
    string? Note = null
);

public record EncaisserRequest([Required, Range(1, int.MaxValue)] int Montant, string? PayMode = null);
// Montant : null ou 0 = transférer tout le solde restant (comportement historique).
// Sinon, transfert partiel (le reliquat du solde reste dû sur le folio).
public record TransfertDebiteurRequest(string? Label = null, int? Montant = null);

public record ContractDataDto(
    // Preneur
    string? PrenomNom,
    string? Nationalite,
    string? PieceIdentite,
    string? Adresse,
    string? Societe,
    // Logement
    string? AptNo,
    int Floor,
    string? PmsType,
    // Séjour
    string Arrival,
    string Departure,
    int Nights,
    // Tarif
    int Rate,
    int MonthlyLoyer,
    bool ElecIncluded,
    string TarifTier,
    // Meta
    string FolioNumber,
    string Today,
    // Remise éventuelle appliquée à la résa liée — 0 si aucune remise.
    int Discount = 0,
    // Référence résa liée (JW-2026-XXXXX) pour affichage sur le contrat.
    string? ReservationReference = null
);
