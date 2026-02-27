/**
 * Normalise une date "YYYY-MM-DD" au lundi de la semaine correspondante (UTC).
 */
export function normalizeToMonday(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dow = date.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

/**
 * Retourne le lundi de la semaine courante au format "YYYY-MM-DD" (heure locale).
 */
export function getCurrentMondayString(): string {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

/**
 * Ajoute `n` semaines (n * 7 jours) à une date "YYYY-MM-DD",
 * en normalisant d'abord au lundi (UTC) pour garantir un résultat toujours lundi.
 */
export function addWeeks(dateStr: string, n: number): string {
  const monday = normalizeToMonday(dateStr);
  monday.setUTCDate(monday.getUTCDate() + n * 7);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
