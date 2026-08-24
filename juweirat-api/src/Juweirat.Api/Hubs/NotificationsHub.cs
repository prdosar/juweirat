using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Juweirat.Api.Hubs;

/// <summary>
/// Hub SignalR pour push serveur → clients. Ne définit aucune méthode côté
/// serveur : les clients écoutent uniquement, ils ne callent pas de RPC.
///
/// Les événements publiés sont documentés dans <see cref="Juweirat.Application.Notifications"/>.
/// Auth : JWT (même clé que l'API REST, cf. Program.cs).
/// </summary>
[Authorize]
public class NotificationsHub : Hub { }
