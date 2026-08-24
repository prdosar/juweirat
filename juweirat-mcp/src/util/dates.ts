// Validation dates YYYY-MM-DD (DateOnly côté EF Core → date côté Postgres).
// On ne fait aucune conversion timezone : les dates métier Juweirat sont naïves (nuit d'hôtel).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertDate(name: string, value: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(`${name} doit être au format YYYY-MM-DD, reçu : ${value}`);
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${name} n'est pas une date valide : ${value}`);
  }
}

export function assertPeriod(from: string, to: string): void {
  assertDate("from", from);
  assertDate("to", to);
  if (from > to) {
    throw new Error(`Période invalide : from (${from}) est postérieur à to (${to}).`);
  }
}

// Nombre de jours (inclusif des 2 bornes) entre 2 dates YYYY-MM-DD.
export function daysBetweenInclusive(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}
