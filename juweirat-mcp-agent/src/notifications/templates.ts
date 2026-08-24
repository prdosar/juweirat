import { toMarkdownV2 } from "../telegram/format.js";

// ─── Payload SignalR ─────────────────────────────────────────────────────────
// Doit rester aligné avec les records C# de juweirat-api (Juweirat.Application.Notifications).
// SignalR sérialise en JSON PascalCase par défaut → on lit les propriétés en Pascal.

export interface NewOnlineReservationEvent {
  ReservationId: number;
  Reference: string;
  ClientFullName: string;
  CategoryNameFr: string;
  CheckInDate: string;   // "YYYY-MM-DD"
  CheckOutDate: string;  // "YYYY-MM-DD"
  Nights: number;
  TotalPrice: number;
  Currency: string;
  OccurredAt: string;    // ISO
}

export interface ClientCheckoutEvent {
  FolioId: number;
  FolioNumber: string;
  UnitLabel: string;
  Guest: string | null;
  CheckoutDate: string | null;
  TotalGeneral: number;
  OccurredAt: string;
}

export interface MaintenanceReportedEvent {
  TicketId: number;
  Zone: string;
  UnitLabel: string | null;
  Category: string;
  Priority: string;      // "Basse" | "Normale" | "Haute" | "Urgente"
  Title: string;
  Description: string | null;
  Tech: string | null;
  OccurredAt: string;
}

// ─── Formatage montants ──────────────────────────────────────────────────────

function formatXof(amount: number): string {
  // Séparateur milliers en espace insécable, suffixe "F".
  return amount.toLocaleString("fr-FR").replace(/\s/g, " ") + " F";
}

function formatDateFr(iso: string): string {
  // "2026-08-24" → "24 août 2026"
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// ─── Templates ───────────────────────────────────────────────────────────────

const SIGNATURE = "\n\n— Angèle 🤖";

export function renderNewOnlineReservation(evt: NewOnlineReservationEvent): string {
  const body =
    `🆕 **Nouvelle réservation en ligne**\n\n` +
    `**Client** : ${evt.ClientFullName}\n` +
    `**Catégorie** : ${evt.CategoryNameFr}\n` +
    `**Séjour** : du ${formatDateFr(evt.CheckInDate)} au ${formatDateFr(evt.CheckOutDate)} (${evt.Nights} nuit${evt.Nights > 1 ? "s" : ""})\n` +
    `**Montant** : ${formatXof(Math.round(evt.TotalPrice))}\n` +
    `**Référence** : ${evt.Reference}` +
    SIGNATURE;
  return toMarkdownV2(body);
}

export function renderClientCheckout(evt: ClientCheckoutEvent): string {
  const guest = evt.Guest ?? "Client";
  const totalStr = evt.TotalGeneral > 0 ? `\n**Total séjour** : ${formatXof(evt.TotalGeneral)}` : "";
  const body =
    `👋 **Départ client**\n\n` +
    `**Client** : ${guest}\n` +
    `**Chambre** : ${evt.UnitLabel}\n` +
    `**Folio** : ${evt.FolioNumber}` +
    totalStr +
    `\n\nChambre libérée, à nettoyer.` +
    SIGNATURE;
  return toMarkdownV2(body);
}

const PRIORITY_ICON: Record<string, string> = {
  Basse: "🟢",
  Normale: "🟡",
  Haute: "🟠",
  Urgente: "🔴",
};

export function renderMaintenanceReported(evt: MaintenanceReportedEvent): string {
  const icon = PRIORITY_ICON[evt.Priority] ?? "⚠️";
  const zone = evt.UnitLabel ?? evt.Zone;
  const desc = evt.Description ? `\n**Description** : ${evt.Description}` : "";
  const tech = evt.Tech ? `\n**Assigné à** : ${evt.Tech}` : "";
  const body =
    `${icon} **Maintenance signalée** (priorité ${evt.Priority})\n\n` +
    `**Zone** : ${zone}\n` +
    `**Catégorie** : ${evt.Category}\n` +
    `**Titre** : ${evt.Title}` +
    desc +
    tech +
    `\n\nTicket #${evt.TicketId}` +
    SIGNATURE;
  return toMarkdownV2(body);
}
