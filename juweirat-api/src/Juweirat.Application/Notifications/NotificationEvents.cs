namespace Juweirat.Application.Notifications;

// Payloads envoyés par SignalR vers les clients externes (agent Node → Telegram).
// Volontairement plats et minimaux : uniquement ce dont Angèle a besoin pour
// composer une notification lisible. On ne veut PAS renvoyer des DTOs riches
// (photos base64, prestations imbriquées…) qui inflate le message pour rien.

public record NewOnlineReservationEvent(
    long ReservationId,
    string Reference,
    string ClientFullName,
    string CategoryNameFr,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Nights,
    decimal TotalPrice,
    string Currency,
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
