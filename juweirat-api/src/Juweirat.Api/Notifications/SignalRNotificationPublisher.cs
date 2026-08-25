using Juweirat.Api.Hubs;
using Juweirat.Application.Notifications;
using Microsoft.AspNetCore.SignalR;

namespace Juweirat.Api.Notifications;

/// <summary>
/// Implémentation SignalR de <see cref="INotificationPublisher"/>. Envoie à
/// tous les clients connectés au Hub (Clients.All). Les échecs sont attrapés
/// et loggés pour ne pas casser le flux métier appelant.
/// </summary>
public sealed class SignalRNotificationPublisher(
    IHubContext<NotificationsHub> hub,
    ILogger<SignalRNotificationPublisher> logger) : INotificationPublisher
{
    public Task NewReservationAsync(NewReservationEvent evt, CancellationToken ct = default)
        => SafeSendAsync("NewReservation", evt, ct);

    public Task ClientCheckinAsync(ClientCheckinEvent evt, CancellationToken ct = default)
        => SafeSendAsync("ClientCheckin", evt, ct);

    public Task ClientCheckoutAsync(ClientCheckoutEvent evt, CancellationToken ct = default)
        => SafeSendAsync("ClientCheckout", evt, ct);

    public Task MaintenanceReportedAsync(MaintenanceReportedEvent evt, CancellationToken ct = default)
        => SafeSendAsync("MaintenanceReported", evt, ct);

    private async Task SafeSendAsync(string method, object payload, CancellationToken ct)
    {
        try
        {
            await hub.Clients.All.SendAsync(method, payload, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "SignalR SendAsync failed for {Method}", method);
        }
    }
}
