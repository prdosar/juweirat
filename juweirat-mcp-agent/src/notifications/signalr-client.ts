import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { config } from "../config.js";
import { generateServiceJwt } from "./jwt-service.js";
import { broadcastToActiveStaff } from "./broadcast.js";
import {
  renderClientCheckin,
  renderClientCheckout,
  renderMaintenanceReported,
  renderNewReservation,
  type ClientCheckinEvent,
  type ClientCheckoutEvent,
  type MaintenanceReportedEvent,
  type NewReservationEvent,
} from "./templates.js";

let connection: HubConnection | null = null;

/**
 * Démarre le client SignalR vers juweirat-api. Reconnexion automatique gérée
 * par la lib : delays [0, 2s, 10s, 30s] puis toutes les 30s indéfiniment.
 * En cas de déconnexion prolongée, on assume la perte d'événements (miss=miss).
 */
export async function startSignalRClient(): Promise<void> {
  connection = new HubConnectionBuilder()
    .withUrl(config.signalr.hubUrl, {
      accessTokenFactory: async () => generateServiceJwt(),
      // On force WebSocket only : plus léger, et surtout évite le fallback
      // long-polling qui posait des soucis avec le buffering nginx.
    })
    .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on("NewReservation", (evt: NewReservationEvent) => {
    console.log(`[notifications] NewReservation reçu (ref=${evt.Reference}, source=${evt.Source ?? "back-office"})`);
    void broadcastToActiveStaff(renderNewReservation(evt)).catch((err) =>
      console.error("[notifications] broadcast NewReservation:", err),
    );
  });

  connection.on("ClientCheckin", (evt: ClientCheckinEvent) => {
    console.log(`[notifications] ClientCheckin reçu (folio=${evt.FolioNumber})`);
    void broadcastToActiveStaff(renderClientCheckin(evt)).catch((err) =>
      console.error("[notifications] broadcast ClientCheckin:", err),
    );
  });

  connection.on("ClientCheckout", (evt: ClientCheckoutEvent) => {
    console.log(`[notifications] ClientCheckout reçu (folio=${evt.FolioNumber})`);
    void broadcastToActiveStaff(renderClientCheckout(evt)).catch((err) =>
      console.error("[notifications] broadcast ClientCheckout:", err),
    );
  });

  connection.on("MaintenanceReported", (evt: MaintenanceReportedEvent) => {
    console.log(`[notifications] MaintenanceReported reçu (ticket=${evt.TicketId})`);
    void broadcastToActiveStaff(renderMaintenanceReported(evt)).catch((err) =>
      console.error("[notifications] broadcast MaintenanceReported:", err),
    );
  });

  connection.onreconnecting((err) => {
    console.warn(`[notifications] Reconnexion SignalR en cours :`, err?.message ?? "sans erreur");
  });
  connection.onreconnected((id) => {
    console.log(`[notifications] Reconnecté au Hub SignalR (connectionId=${id})`);
  });
  connection.onclose((err) => {
    console.error(`[notifications] Connexion SignalR fermée :`, err?.message ?? "arrêt propre");
  });

  try {
    await connection.start();
    console.log(`[notifications] Connecté au Hub SignalR ${config.signalr.hubUrl}`);
  } catch (err) {
    // Ne bloque pas le démarrage de l'agent : le webhook Telegram reste
    // fonctionnel même si le hub n'est pas joignable au boot (retry auto).
    console.error(
      `[notifications] Échec connexion initiale SignalR (${config.signalr.hubUrl}), retry auto :`,
      err instanceof Error ? err.message : err,
    );
    setTimeout(() => void startSignalRClient(), 10_000);
  }
}

export async function stopSignalRClient(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
  connection = null;
}
