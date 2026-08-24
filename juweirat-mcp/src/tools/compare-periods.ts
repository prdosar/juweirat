import { z } from "zod";
import { handler as occupancyHandler, inputSchema as occupancySchema } from "./occupancy.js";
import { handler as revenueHandler, inputSchema as revenueSchema } from "./revenue.js";

export const inputSchema = z.object({
  metric: z
    .enum(["occupancy", "revenue"])
    .describe("Métrique à comparer entre les 2 périodes."),
  a: z.object({
    from: z.string().describe("Début période A (YYYY-MM-DD)."),
    to: z.string().describe("Fin période A (YYYY-MM-DD)."),
  }),
  b: z.object({
    from: z.string().describe("Début période B (YYYY-MM-DD)."),
    to: z.string().describe("Fin période B (YYYY-MM-DD)."),
  }),
  category: z
    .enum(["T1", "T2", "T3", "T4"])
    .optional()
    .describe("Pour metric='occupancy' uniquement : filtre catégorie."),
});

export type CompareInput = z.infer<typeof inputSchema>;

export const definition = {
  name: "compare_periods",
  description:
    "Compare 2 périodes sur une métrique (occupation ou CA encaissé) et retourne les deux résultats + delta absolu et relatif.",
  inputSchema,
} as const;

function extractValue(metric: "occupancy" | "revenue", json: string): number {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  if (metric === "occupancy") return parsed.occupancyPercent as number;
  return parsed.total as number;
}

export async function handler(input: CompareInput): Promise<string> {
  const runOne = async (period: { from: string; to: string }): Promise<string> => {
    if (input.metric === "occupancy") {
      return occupancyHandler(occupancySchema.parse({ ...period, category: input.category }));
    }
    return revenueHandler(revenueSchema.parse({ ...period, breakdown: "none" }));
  };

  const [rawA, rawB] = await Promise.all([runOne(input.a), runOne(input.b)]);
  const valA = extractValue(input.metric, rawA);
  const valB = extractValue(input.metric, rawB);
  const deltaAbs = valB - valA;
  const deltaPct = valA === 0 ? null : Number(((deltaAbs / valA) * 100).toFixed(2));

  return JSON.stringify(
    {
      metric: input.metric,
      unit: input.metric === "occupancy" ? "%" : "XOF",
      a: { period: input.a, value: valA, detail: JSON.parse(rawA) },
      b: { period: input.b, value: valB, detail: JSON.parse(rawB) },
      delta: { absolute: Number(deltaAbs.toFixed(2)), percent: deltaPct },
    },
    null,
    2,
  );
}
