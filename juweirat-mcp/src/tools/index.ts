import { z, type ZodTypeAny } from "zod";
import * as occupancy from "./occupancy.js";
import * as revenue from "./revenue.js";
import * as revpar from "./revpar.js";
import * as comparePeriods from "./compare-periods.js";
import * as reservations from "./reservations.js";
import * as folios from "./folios.js";
import * as housekeeping from "./housekeeping.js";

export interface McpTool<TSchema extends ZodTypeAny = ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TSchema;
  handler: (input: z.infer<TSchema>) => Promise<string>;
}

type AnyHandler = (i: unknown) => Promise<string>;

export const tools: McpTool[] = [
  // ── Occupation & revenus ──
  { ...occupancy.definition, handler: occupancy.handler as AnyHandler },
  { ...revenue.definition, handler: revenue.handler as AnyHandler },
  { ...revpar.definition, handler: revpar.handler as AnyHandler },
  { ...comparePeriods.definition, handler: comparePeriods.handler as AnyHandler },

  // ── Réservations ──
  { ...reservations.searchDefinition, handler: reservations.searchHandler as AnyHandler },
  { ...reservations.getDefinition, handler: reservations.getHandler as AnyHandler },
  { ...reservations.historyDefinition, handler: reservations.historyHandler as AnyHandler },
  { ...reservations.noShowDefinition, handler: reservations.noShowHandler as AnyHandler },

  // ── Folios & compta ──
  { ...folios.getDefinition, handler: folios.getHandler as AnyHandler },
  { ...folios.unpaidDefinition, handler: folios.unpaidHandler as AnyHandler },
  { ...folios.cashDefinition, handler: folios.cashHandler as AnyHandler },
  { ...folios.tvaDefinition, handler: folios.tvaHandler as AnyHandler },

  // ── Housekeeping & maintenance ──
  { ...housekeeping.roomsDefinition, handler: housekeeping.roomsHandler as AnyHandler },
  { ...housekeeping.cleaningHistoryDefinition, handler: housekeeping.cleaningHistoryHandler as AnyHandler },
  { ...housekeeping.cleaningsOnDefinition, handler: housekeeping.cleaningsOnHandler as AnyHandler },
  { ...housekeeping.ticketsDefinition, handler: housekeeping.ticketsHandler as AnyHandler },
];
