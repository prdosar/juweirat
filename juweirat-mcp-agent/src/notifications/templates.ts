import { toMarkdownV2 } from "../telegram/format.js";

// ─── Payload SignalR ─────────────────────────────────────────────────────────
// Doit rester aligné avec les records C# de juweirat-api (Juweirat.Application.Notifications).
// SignalR sérialise en JSON PascalCase par défaut → on lit les propriétés en Pascal.

// Émis pour TOUTE création de résa (site public, admin, MCP, autres canaux).
// Source distingue l'origine : "website" | "phone" | "walkIn" | "bookingCom" | "airbnb" | null.
export interface NewReservationEvent {
  ReservationId: number;
  Reference: string;
  ClientFullName: string;
  CompanyName: string | null;
  CategoryNameFr: string;
  Source: string | null;
  CheckInDate: string;   // "YYYY-MM-DD"
  CheckOutDate: string;  // "YYYY-MM-DD"
  Nights: number;
  TotalPrice: number;
  Currency: string;
  OccurredAt: string;    // ISO
}

// Émis quand un staff clique "Check-in" dans le PMS (transition CheckedIn false→true).
export interface ClientCheckinEvent {
  FolioId: number;
  FolioNumber: string;
  UnitLabel: string;
  Guest: string | null;
  CompanyName: string | null;
  Arrival: string;    // "YYYY-MM-DD"
  Departure: string;  // "YYYY-MM-DD"
  Nights: number;
  OccurredAt: string;
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

const SOURCE_LABEL: Record<string, string> = {
  website:    "site web",
  phone:      "téléphone",
  walkIn:     "walk-in",
  bookingCom: "Booking.com",
  airbnb:     "Airbnb",
  admin:      "back-office",
};

export function renderNewReservation(evt: NewReservationEvent): string {
  const sourceLabel = evt.Source ? (SOURCE_LABEL[evt.Source] ?? evt.Source) : "back-office";
  const client = evt.CompanyName ? `${evt.ClientFullName} (${evt.CompanyName})` : evt.ClientFullName;
  const body =
    `🆕 **Nouvelle réservation** (${sourceLabel})\n\n` +
    `**Client** : ${client}\n` +
    `**Catégorie** : ${evt.CategoryNameFr}\n` +
    `**Séjour** : du ${formatDateFr(evt.CheckInDate)} au ${formatDateFr(evt.CheckOutDate)} (${evt.Nights} nuit${evt.Nights > 1 ? "s" : ""})\n` +
    `**Montant** : ${formatXof(Math.round(evt.TotalPrice))}\n` +
    `**Référence** : ${evt.Reference}` +
    SIGNATURE;
  return toMarkdownV2(body);
}

export function renderClientCheckin(evt: ClientCheckinEvent): string {
  const guest = evt.Guest ?? "Client";
  const clientLine = evt.CompanyName ? `${guest} (${evt.CompanyName})` : guest;
  const body =
    `🛬 **Check-in effectué**\n\n` +
    `**Client** : ${clientLine}\n` +
    `**Chambre** : ${evt.UnitLabel}\n` +
    `**Séjour** : du ${formatDateFr(evt.Arrival)} au ${formatDateFr(evt.Departure)} (${evt.Nights} nuit${evt.Nights > 1 ? "s" : ""})\n` +
    `**Folio** : ${evt.FolioNumber}` +
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
