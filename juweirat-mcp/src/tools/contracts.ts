import { z } from "zod";
import { query } from "../db.js";
import { assertDate } from "../util/dates.js";

// ─── list_company_contracts ──────────────────────────────────────────────────

const CONTRACT_STATUSES = ["Active", "Ended", "Cancelled"] as const;

export const listInputSchema = z.object({
  status: z
    .enum(CONTRACT_STATUSES)
    .optional()
    .describe("Filtrer sur un statut (Active | Ended | Cancelled)."),
  companyId: z.number().int().positive().optional().describe("Filtrer sur une compagnie."),
  roomId: z.number().int().positive().optional().describe("Filtrer sur une chambre."),
  activeOn: z
    .string()
    .optional()
    .describe(
      "YYYY-MM-DD : ne retourner que les contrats couvrant cette date (StartDate ≤ date < EndDate ET status = Active). Utiliser 'aujourd'hui' pour l'instant présent.",
    ),
  limit: z.number().int().min(1).max(100).default(50),
});

export const listDefinition = {
  name: "list_company_contracts",
  description:
    "Liste les contrats compagnie long terme (baux entre Juweirat et une entreprise sur une chambre). Retourne référence (CT-YYYY-NNNN), compagnie, chambre, période, loyer mensuel, fréquence de facturation (Mensuelle/Trimestrielle/Semestrielle/Annuelle), statut, nombre d'occupants réels (hors résa placeholder). Utilise ce tool pour : \"quels contrats actifs\", \"contrats de Yas\", \"chambres louées à des entreprises\", \"combien de contrats long terme\".",
  inputSchema: listInputSchema,
} as const;

type ContractRow = {
  id: number;
  reference: string;
  companyId: number;
  companyName: string;
  roomId: number;
  roomNumber: string;
  roomNameFr: string | null;
  startDate: string;
  endDate: string;
  monthlyRate: number;
  billingFrequency: string;
  status: string;
  tvaExonere: boolean;
  elecIncluded: boolean;
  occupantCount: number;
  notes: string | null;
  createdAt: string;
};

export async function listHandler(input: z.infer<typeof listInputSchema>): Promise<string> {
  if (input.activeOn) assertDate("activeOn", input.activeOn);

  const rows = await query<ContractRow>(
    `
    SELECT
      cc.id, cc.reference,
      cc."companyId", co.name AS "companyName",
      cc."roomId", rm."roomNumber", rm."nameFr" AS "roomNameFr",
      to_char(cc."startDate", 'YYYY-MM-DD') AS "startDate",
      to_char(cc."endDate",   'YYYY-MM-DD') AS "endDate",
      cc."monthlyRate",
      cc."billingFrequency",
      cc.status,
      cc."tvaExonere",
      cc."elecIncluded",
      cc.notes,
      to_char(cc."createdAt", 'YYYY-MM-DD"T"HH24:MI:SSOF') AS "createdAt",
      COALESCE((
        SELECT COUNT(*)
        FROM reservations r
        WHERE r."companyContractId" = cc.id
          AND r."isContractPlaceholder" = false
          AND r.status <> 'Cancelled'
      ), 0)::int AS "occupantCount"
    FROM "companyContracts" cc
    JOIN companies co ON co.id = cc."companyId"
    JOIN rooms rm ON rm.id = cc."roomId"
    WHERE ($1::text IS NULL OR cc.status = $1)
      AND ($2::bigint IS NULL OR cc."companyId" = $2)
      AND ($3::bigint IS NULL OR cc."roomId" = $3)
      AND (
        $4::date IS NULL OR (
          cc.status = 'Active'
          AND cc."startDate" <= $4::date
          AND $4::date < cc."endDate"
        )
      )
    ORDER BY cc."startDate" DESC
    LIMIT $5
    `,
    [
      input.status ?? null,
      input.companyId ?? null,
      input.roomId ?? null,
      input.activeOn ?? null,
      input.limit,
    ],
  );

  return JSON.stringify(
    { count: rows.length, currency: "XOF", contracts: rows },
    null,
    2,
  );
}

// ─── get_company_contract ────────────────────────────────────────────────────

export const getInputSchema = z.object({
  identifier: z
    .string()
    .describe(
      "ID numérique OU référence (ex. 'CT-2026-0001'). Détection automatique.",
    ),
});

export const getDefinition = {
  name: "get_company_contract",
  description:
    "Détail complet d'un contrat compagnie : compagnie, chambre, période, loyer mensuel, fréquence facturation, occupants réels rattachés (résas des employés qui séjournent, hors placeholder), historique des factures émises (avec statut Issued/Paid/Cancelled). Utilise ce tool pour : \"détail du contrat Yas\", \"combien d'employés sont passés sur ce contrat\", \"factures du contrat X\".",
  inputSchema: getInputSchema,
} as const;

export async function getHandler(input: z.infer<typeof getInputSchema>): Promise<string> {
  const isNumericId = /^\d+$/.test(input.identifier);
  const rows = await query<Record<string, unknown>>(
    `
    SELECT
      cc.id, cc.reference,
      cc."companyId", co.name AS "companyName",
      cc."roomId", rm."roomNumber", rm."nameFr" AS "roomNameFr",
      to_char(cc."startDate", 'YYYY-MM-DD') AS "startDate",
      to_char(cc."endDate",   'YYYY-MM-DD') AS "endDate",
      cc."monthlyRate",
      cc."billingFrequency",
      cc.status,
      cc."tvaExonere",
      cc."elecIncluded",
      cc.notes,
      to_char(cc."createdAt", 'YYYY-MM-DD"T"HH24:MI:SSOF') AS "createdAt"
    FROM "companyContracts" cc
    JOIN companies co ON co.id = cc."companyId"
    JOIN rooms rm ON rm.id = cc."roomId"
    WHERE ${isNumericId ? "cc.id = $1::bigint" : "cc.reference = $1"}
    `,
    [isNumericId ? Number(input.identifier) : input.identifier],
  );

  if (rows.length === 0) {
    return JSON.stringify({ found: false, identifier: input.identifier });
  }

  const contract = rows[0];

  // Occupants réels (résas d'employés rattachées, HORS placeholder auto).
  const occupants = await query(
    `
    SELECT
      r.id, r.reference, r.status,
      to_char(r."checkInDate",  'YYYY-MM-DD') AS "checkInDate",
      to_char(r."checkOutDate", 'YYYY-MM-DD') AS "checkOutDate",
      r.nights,
      cl."firstName" || ' ' || cl."lastName" AS "clientName",
      cl.phone AS "clientPhone",
      r."totalPrice"::float8 AS "totalPrice"
    FROM reservations r
    JOIN clients cl ON cl.id = r."clientId"
    WHERE r."companyContractId" = $1
      AND r."isContractPlaceholder" = false
    ORDER BY r."checkInDate"
    `,
    [contract.id],
  );

  // Factures liées + agrégats de facturation.
  const invoices = await query(
    `
    SELECT
      i.id, i.number,
      i."periodIndex", i."monthsCovered", i.year,
      to_char(i."periodStart", 'YYYY-MM-DD') AS "periodStart",
      to_char(i."periodEnd",   'YYYY-MM-DD') AS "periodEnd",
      i."totalHt", i.tva, i."totalTtc",
      i."tvaRate"::float8 AS "tvaRate",
      i."tvaExonere", i."elecIncluded",
      i.status,
      to_char(i."issuedAt", 'YYYY-MM-DD"T"HH24:MI:SSOF') AS "issuedAt",
      to_char(i."paidAt",   'YYYY-MM-DD"T"HH24:MI:SSOF') AS "paidAt",
      i."paymentMethod", i."paymentRef"
    FROM "contractInvoices" i
    WHERE i."companyContractId" = $1
    ORDER BY i."periodIndex"
    `,
    [contract.id],
  );

  const totals = {
    invoicesTotal: invoices.length,
    issuedCount: invoices.filter((i: any) => i.status === "Issued").length,
    paidCount: invoices.filter((i: any) => i.status === "Paid").length,
    cancelledCount: invoices.filter((i: any) => i.status === "Cancelled").length,
    totalIssuedTtc: invoices
      .filter((i: any) => i.status === "Issued")
      .reduce((s: number, i: any) => s + Number(i.totalTtc || 0), 0),
    totalPaidTtc: invoices
      .filter((i: any) => i.status === "Paid")
      .reduce((s: number, i: any) => s + Number(i.totalTtc || 0), 0),
  };

  return JSON.stringify(
    {
      found: true,
      currency: "XOF",
      contract,
      occupants: { count: occupants.length, items: occupants },
      invoices: { ...totals, items: invoices },
    },
    null,
    2,
  );
}

// ─── list_contract_invoices ──────────────────────────────────────────────────

const INVOICE_STATUSES = ["Issued", "Paid", "Cancelled"] as const;

export const invoicesInputSchema = z.object({
  status: z
    .enum(INVOICE_STATUSES)
    .optional()
    .describe("Filtrer sur un statut (Issued = à encaisser, Paid = encaissée, Cancelled = annulée)."),
  companyId: z.number().int().positive().optional().describe("Filtrer sur une compagnie."),
  contractReference: z
    .string()
    .optional()
    .describe("Filtrer sur une référence de contrat (ex. 'CT-2026-0001')."),
  year: z.number().int().min(2020).max(2100).optional().describe("Année civile de la période facturée."),
  limit: z.number().int().min(1).max(200).default(100),
});

export const invoicesDefinition = {
  name: "list_contract_invoices",
  description:
    "Liste les factures de contrats compagnie (une facture par période P1..PN). Utilise ce tool pour : \"factures impayées des contrats\", \"factures trimestrielles de Yas\", \"combien de factures Issued en attente d'encaissement\", \"factures émises en 2026\".",
  inputSchema: invoicesInputSchema,
} as const;

type InvoiceRow = {
  id: number;
  number: string;
  contractReference: string;
  companyName: string;
  roomNumber: string;
  periodIndex: number;
  monthsCovered: number;
  year: number;
  periodStart: string;
  periodEnd: string;
  totalHt: number;
  tva: number;
  totalTtc: number;
  tvaExonere: boolean;
  elecIncluded: boolean;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
};

export async function invoicesHandler(
  input: z.infer<typeof invoicesInputSchema>,
): Promise<string> {
  const rows = await query<InvoiceRow>(
    `
    SELECT
      i.id, i.number,
      cc.reference AS "contractReference",
      co.name AS "companyName",
      rm."roomNumber",
      i."periodIndex", i."monthsCovered", i.year,
      to_char(i."periodStart", 'YYYY-MM-DD') AS "periodStart",
      to_char(i."periodEnd",   'YYYY-MM-DD') AS "periodEnd",
      i."totalHt", i.tva, i."totalTtc",
      i."tvaExonere", i."elecIncluded",
      i.status,
      to_char(i."issuedAt", 'YYYY-MM-DD"T"HH24:MI:SSOF') AS "issuedAt",
      to_char(i."paidAt",   'YYYY-MM-DD"T"HH24:MI:SSOF') AS "paidAt",
      i."paymentMethod"
    FROM "contractInvoices" i
    JOIN "companyContracts" cc ON cc.id = i."companyContractId"
    JOIN companies co ON co.id = cc."companyId"
    JOIN rooms rm ON rm.id = cc."roomId"
    WHERE ($1::text   IS NULL OR i.status = $1)
      AND ($2::bigint IS NULL OR cc."companyId" = $2)
      AND ($3::text   IS NULL OR cc.reference = $3)
      AND ($4::int    IS NULL OR i.year = $4)
    ORDER BY i."issuedAt" DESC, i.id DESC
    LIMIT $5
    `,
    [
      input.status ?? null,
      input.companyId ?? null,
      input.contractReference ?? null,
      input.year ?? null,
      input.limit,
    ],
  );

  const totals = {
    count: rows.length,
    totalHt: rows.reduce((s, r) => s + Number(r.totalHt || 0), 0),
    totalTtc: rows.reduce((s, r) => s + Number(r.totalTtc || 0), 0),
    issuedTtc: rows
      .filter((r) => r.status === "Issued")
      .reduce((s, r) => s + Number(r.totalTtc || 0), 0),
    paidTtc: rows
      .filter((r) => r.status === "Paid")
      .reduce((s, r) => s + Number(r.totalTtc || 0), 0),
  };

  return JSON.stringify({ ...totals, currency: "XOF", invoices: rows }, null, 2);
}

// ─── get_contracts_summary ───────────────────────────────────────────────────

export const summaryInputSchema = z.object({});

export const summaryDefinition = {
  name: "get_contracts_summary",
  description:
    "Vue d'ensemble des contrats compagnie : nombre de contrats actifs, revenu mensuel cumulé attendu (somme des MonthlyRate des contrats actifs), factures émises non encaissées (compte + montant TTC), factures encaissées ce mois-ci. Utilise ce tool pour : \"combien de contrats long terme actifs\", \"quel loyer mensuel total\", \"factures impayées des contrats\", \"état de la facturation contrats\".",
  inputSchema: summaryInputSchema,
} as const;

export async function summaryHandler(): Promise<string> {
  const activeContracts = await query<{
    activeCount: number;
    totalMonthlyRate: number;
  }>(
    `
    SELECT
      COUNT(*)::int                        AS "activeCount",
      COALESCE(SUM("monthlyRate"), 0)::int AS "totalMonthlyRate"
    FROM "companyContracts"
    WHERE status = 'Active'
    `,
  );

  const invoiceSummary = await query<{
    issuedCount: number;
    issuedTtc: number;
    paidThisMonthCount: number;
    paidThisMonthTtc: number;
    cancelledCount: number;
  }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'Issued')::int                                                AS "issuedCount",
      COALESCE(SUM("totalTtc") FILTER (WHERE status = 'Issued'), 0)::int                            AS "issuedTtc",
      COUNT(*) FILTER (WHERE status = 'Paid' AND "paidAt" >= date_trunc('month', CURRENT_DATE))::int AS "paidThisMonthCount",
      COALESCE(SUM("totalTtc") FILTER (WHERE status = 'Paid' AND "paidAt" >= date_trunc('month', CURRENT_DATE)), 0)::int AS "paidThisMonthTtc",
      COUNT(*) FILTER (WHERE status = 'Cancelled')::int                                              AS "cancelledCount"
    FROM "contractInvoices"
    `,
  );

  return JSON.stringify(
    {
      currency: "XOF",
      contracts: activeContracts[0] ?? { activeCount: 0, totalMonthlyRate: 0 },
      invoices: invoiceSummary[0] ?? {
        issuedCount: 0,
        issuedTtc: 0,
        paidThisMonthCount: 0,
        paidThisMonthTtc: 0,
        cancelledCount: 0,
      },
    },
    null,
    2,
  );
}
