import { format, parseISO } from "date-fns";

/**
 * Presentation-only formatting. These helpers never round for the purpose of
 * calculation: business math lives in lib/calculations and feature calculation
 * modules, and only its output reaches here.
 */

/** `2026-06-01` -> `1 Jun 2026`. Returns a dash for missing values. */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return "—";
  }
}

/** `2026-06-01T09:30:00Z` -> `1 Jun 2026, 09:30`. */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy, HH:mm");
  } catch {
    return "—";
  }
}

/** Semester code `202602` -> `2026 / Term 2`. */
export function formatSemesterCode(code: string): string {
  if (!/^\d{6}$/.test(code)) return code;
  return `${code.slice(0, 4)} / Term ${Number(code.slice(4))}`;
}

export function formatCurrency(amount: number, currency = "THB"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Scores are shown to two decimals so weighted arithmetic stays checkable. */
export function formatScore(value: number): string {
  return value.toFixed(2);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${formatNumber(value, fractionDigits)}%`;
}

/** `problemSolving` -> `Problem Solving`. Used for criterion keys. */
export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** `Aoi`, `Tanaka` -> `AT`. Falls back to a single initial. */
export function initials(firstName: string, lastName?: string): string {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return `${a}${b}` || "?";
}
