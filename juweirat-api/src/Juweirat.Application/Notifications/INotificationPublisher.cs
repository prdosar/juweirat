namespace Juweirat.Application.Notifications;

/// <summary>
/// Contrat de publication d'événements métier temps réel. L'implémentation vit
/// dans la couche Api (SignalR), mais l'interface est ici pour que les services
/// Infrastructure puissent l'injecter sans dépendre d'ASP.NET Core.
///
/// Fire-and-forget côté appelant : les échecs de publication (aucun client
/// connecté, hub down…) sont loggés dans l'implémentation, jamais propagés.
/// </summary>
public interface INotificationPublisher
{
    Task NewReservationAsync(NewReservationEvent evt, CancellationToken ct = default);
    Task ClientCheckinAsync(ClientCheckinEvent evt, CancellationToken ct = default);
    Task ClientCheckoutAsync(ClientCheckoutEvent evt, CancellationToken ct = default);
    Task MaintenanceReportedAsync(MaintenanceReportedEvent evt, CancellationToken ct = default);
}
