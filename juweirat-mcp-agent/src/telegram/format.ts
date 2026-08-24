import { config } from "../config.js";

// Caractères à échapper pour MarkdownV2 (docs Telegram) :
// _ * [ ] ( ) ~ ` > # + - = | { } . !
const MARKDOWN_V2_RESERVED = /[_*[\]()~`>#+\-=|{}.!\\]/g;

/**
 * Échappe une chaîne pour MarkdownV2. On garde le formatage utile (gras,
 * italiques) en pré-substituant les patterns légitimes.
 *
 * Approche simple : on prend le markdown "GFM-like" produit par le modèle et on
 * transforme le sous-ensemble supporté par MarkdownV2 (gras `**txt**` → `*txt*`,
 * italique `*txt*` → `_txt_`) puis on échappe le reste.
 *
 * Les tables markdown GFM ne sont PAS supportées nativement par Telegram :
 * on les convertit en bloc code ```` ``` ```` (rendu monospace, lisible).
 */
export function toMarkdownV2(gfm: string): string {
  const chunks: string[] = [];
  let i = 0;
  // On segmente sur les blocs code fence (```lang ... ```) pour ne pas y toucher.
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(gfm)) !== null) {
    if (match.index > i) chunks.push(escapeInline(gfm.slice(i, match.index)));
    const [, lang, body] = match;
    // Contenu de code : dans MarkdownV2, seul \ et ` doivent être échappés.
    const safeBody = body.replace(/[`\\]/g, (c) => `\\${c}`);
    chunks.push("```" + (lang || "") + "\n" + safeBody + "```");
    i = match.index + match[0].length;
  }
  if (i < gfm.length) chunks.push(escapeInline(gfm.slice(i)));

  return convertTablesToCodeBlocks(chunks.join(""));
}

function escapeInline(text: string): string {
  // 1) **gras** → *gras* (syntaxe MarkdownV2), avant d'échapper les *.
  //    On protège avec un placeholder pour ne pas double-échapper.
  const BOLD = "", BOLDCLOSE = "";
  let out = text.replace(/\*\*(.+?)\*\*/g, `${BOLD}$1${BOLDCLOSE}`);

  // 2) Échappement générique des caractères réservés.
  out = out.replace(MARKDOWN_V2_RESERVED, (c) => `\\${c}`);

  // 3) Restauration du gras échappé → syntaxe MarkdownV2.
  out = out.split(BOLD).join("*").split(BOLDCLOSE).join("*");

  return out;
}

/**
 * Convertit les tables markdown GFM en blocs code monospace, seul rendu tabulaire
 * lisible dans Telegram (MarkdownV2 ignore les pipes).
 */
function convertTablesToCodeBlocks(md: string): string {
  // Détection heuristique : une ligne header `| a | b |` suivie d'un séparateur
  // `|---|---|`. On agrège les lignes suivantes tant qu'elles commencent par `|`.
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";
    const isHeader = /^\s*\\?\|.*\\?\|\s*$/.test(line);
    const isSep = /^\s*\\?\|[\s:\\|.-]+\\?\|\s*$/.test(next);
    if (isHeader && isSep) {
      const table: string[] = [line];
      i += 2;
      while (i < lines.length && /^\s*\\?\|/.test(lines[i])) {
        table.push(lines[i]);
        i += 1;
      }
      // Dé-échappe les pipes/backslashs qu'on avait ajoutés à escapeInline.
      const raw = table.join("\n").replace(/\\([|\-:.])/g, "$1");
      out.push("```\n" + raw + "\n```");
      continue;
    }
    out.push(line);
    i += 1;
  }
  return out.join("\n");
}

// ─── Extraction des blocs ```chart ...``` ────────────────────────────────────

export interface ChartBlock {
  type: "bar" | "line" | "pie";
  title?: string;
  unit?: string;
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  data: Array<Record<string, unknown>>;
}

export interface ExtractedContent {
  textWithoutCharts: string;
  charts: ChartBlock[];
}

/**
 * Retire les blocs ```chart {...}``` du markdown et les retourne à part pour
 * rendu séparé (PNG via quickchart.io).
 */
export function extractCharts(md: string): ExtractedContent {
  const charts: ChartBlock[] = [];
  const cleaned = md.replace(/```chart\s*\n([\s\S]*?)```/g, (_all, body: string) => {
    try {
      const parsed = JSON.parse(body) as ChartBlock;
      charts.push(parsed);
    } catch {
      // JSON invalide → on laisse tel quel (bloc code visible) pour ne pas cacher un bug modèle.
      return "```json\n" + body + "```";
    }
    return "";
  });
  return { textWithoutCharts: cleaned.trim(), charts };
}

// ─── Rendu quickchart.io ─────────────────────────────────────────────────────

/**
 * Construit une URL quickchart.io renvoyant un PNG. On encode la config
 * Chart.js dans le query string (attention à la taille : GET limit ~2 kB, plus
 * que suffisant pour nos ventilations).
 */
export function chartToQuickchartUrl(chart: ChartBlock): string {
  const chartJs = buildChartJsConfig(chart);
  const encoded = encodeURIComponent(JSON.stringify(chartJs));
  return `${config.telegram.quickchartUrl}?c=${encoded}&w=600&h=400&bkg=white`;
}

function buildChartJsConfig(chart: ChartBlock): Record<string, unknown> {
  const title = chart.title;

  if (chart.type === "pie") {
    const nameKey = chart.nameKey ?? "name";
    const valueKey = chart.valueKey ?? "value";
    return {
      type: "pie",
      data: {
        labels: chart.data.map((d) => String(d[nameKey] ?? "")),
        datasets: [{ data: chart.data.map((d) => Number(d[valueKey] ?? 0)) }],
      },
      options: { plugins: title ? { title: { display: true, text: title } } : {} },
    };
  }

  const xKey = chart.xKey ?? "x";
  const yKeys = chart.yKeys ?? ["value"];
  return {
    type: chart.type, // "bar" | "line"
    data: {
      labels: chart.data.map((d) => String(d[xKey] ?? "")),
      datasets: yKeys.map((yk) => ({
        label: yk,
        data: chart.data.map((d) => Number(d[yk] ?? 0)),
        fill: chart.type === "line" ? false : undefined,
      })),
    },
    options: {
      plugins: title ? { title: { display: true, text: title } } : {},
      scales: chart.unit
        ? { y: { ticks: { callback: `function(v){return v+' ${chart.unit}';}` } } }
        : undefined,
    },
  };
}

// ─── Split long messages (Telegram max = 4096 chars) ─────────────────────────

const TG_MAX_TEXT = 4000; // marge sous 4096 pour l'échappement

export function splitForTelegram(text: string): string[] {
  if (text.length <= TG_MAX_TEXT) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > TG_MAX_TEXT) {
    // Cherche un point de coupe sur double newline ou newline, sinon coupe brut.
    let cut = remaining.lastIndexOf("\n\n", TG_MAX_TEXT);
    if (cut < TG_MAX_TEXT / 2) cut = remaining.lastIndexOf("\n", TG_MAX_TEXT);
    if (cut < TG_MAX_TEXT / 2) cut = TG_MAX_TEXT;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n+/, "");
  }
  if (remaining.length > 0) parts.push(remaining);
  return parts;
}
