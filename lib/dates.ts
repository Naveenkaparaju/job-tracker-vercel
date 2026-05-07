// Date helpers. Always use the ATS startDate ISO as authoritative.
// Never compute "freshness" from crawler time.

const DAY_MS = 24 * 60 * 60 * 1000;
export const FRESHNESS_DAYS = 5;

export function daysSince(iso: string, now: Date = new Date()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

export function isFresh(iso: string, now: Date = new Date()): boolean {
  const d = daysSince(iso, now);
  return d >= 0 && d <= FRESHNESS_DAYS;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatMDY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

/**
 * Build the date header exactly as required:
 *   Posted Today · MM/DD/YYYY
 *   Posted Yesterday · MM/DD/YYYY
 *   MM/DD/YYYY
 */
export function dateHeader(iso: string, now: Date = new Date()): string {
  const d = daysSince(iso, now);
  const mdy = formatMDY(iso);
  if (d === 0) return `Posted Today · ${mdy}`;
  if (d === 1) return `Posted Yesterday · ${mdy}`;
  return mdy;
}
