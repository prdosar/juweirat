namespace Juweirat.Application.Notifications;

// Payloads envoyés par SignalR vers les clients externes (agent Node → Telegram).
// Volontairement plats et minimaux : uniquement ce dont Angèle a besoin pour
// composer une notification lisible. On ne veut PAS renvoyer des DTOs riches
// (photos base64, prestations imbriquées…) qui inflate le message pour rien.

// Émis pour TOUTE création de résa (site public, admin, autres canaux).
// Source distingue l'origine : website | phone | walkIn | bookingCom | airbnb | admin | null.
public record NewReservationEvent(
    long ReservationId,
    string Reference,
    string ClientFullName,
    string? CompanyName,
    string CategoryNameFr,
    string? Source,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Nights,
    decimal TotalPrice,
    string Currency,
    DateTime OccurredAt);

// Émis quand un staff clique "Check-in" dans le PMS (transition CheckedIn false→true).
public record ClientCheckinEvent(
    long FolioId,
    string FolioNumber,
    string UnitLabel,
    string? Guest,
    string? CompanyName,
    DateOnly Arrival,
    DateOnly Departure,
    int Nights,
    DateTime OccurredAt);

public record ClientCheckoutEvent(
    long FolioId,
    string FolioNumber,
    string UnitLabel,
    string? Guest,
    DateOnly? CheckoutDate,
    int TotalGeneral,
    DateTime OccurredAt);

public record MaintenanceReportedEvent(
    long TicketId,
    string Zone,
    string? UnitLabel,
    string Category,
    string Priority,
    string Title,
    string? Description,
    string? Tech,
    DateTime OccurredAt);
