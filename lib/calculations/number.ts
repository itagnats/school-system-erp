/**
 * Rounding primitives shared by the cost and evaluation calculations.
 *
 * Every calculation module rounds through these so that a figure shown in one
 * place and the same figure summed somewhere else cannot disagree by a cent.
 */

/** Round half-away-from-zero to a fixed number of decimals. */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  // Number.EPSILON compensates for binary representation, so 1.005 rounds up.
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

/** Money is carried to two decimals throughout. */
export function roundMoney(value: number): number {
  return round(value, 2);
}

/** Scores are carried to two decimals so weighted sums stay checkable. */
export function roundScore(value: number): number {
  return round(value, 2);
}

/** Percentage of a total, guarding a zero denominator. */
export function percentOf(part: number, total: number, decimals = 2): number {
  if (total === 0) return 0;
  return round((part / total) * 100, decimals);
}

/** Clamp into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Mean of a list, or null when empty. Never returns NaN. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
