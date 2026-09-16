import type { EvaluationWindowStatus } from "@/types";

/**
 * The evaluation window: which moves it allows, and which dates make sense.
 *
 * Here rather than in `server/` for the reason the data-layer skill gives -
 * every file under `server/` imports `server-only`, which Vitest refuses, so
 * anything worth asserting on has to live in a calculation module and take its
 * inputs as arguments.
 */

/**
 * The window transitions the domain allows.
 *
 * Held as data rather than a chain of ifs, the same shape as
 * `INVOICE_TRANSITIONS`, so the server, the UI and a test all read one table.
 *
 * **`closed -> open` is deliberate.** An administrator does reopen a window for
 * a late submitter, and that is a legitimate act rather than an escape hatch;
 * making it impossible would only push someone to edit the dates instead, which
 * is the same change without the record of it. Publishing, by contrast, is
 * terminal: reports have been read by then, and a published evaluation that
 * could reopen would let a report change after its reader saw it.
 */
export const EVALUATION_WINDOW_TRANSITIONS: Record<
  EvaluationWindowStatus,
  EvaluationWindowStatus[]
> = {
  draft: ["open"],
  open: ["closed"],
  closed: ["open", "published"],
  published: [],
};

/** A move to the status it already holds is a no-op, not an illegal move. */
export function canTransitionWindow(
  from: EvaluationWindowStatus,
  to: EvaluationWindowStatus,
): boolean {
  return from === to || EVALUATION_WINDOW_TRANSITIONS[from].includes(to);
}

export interface EvaluationWindowDates {
  opensOn: string;
  closesOn: string;
  reportDate: string;
}

/**
 * The three dates, checked against each other.
 *
 * Returned as field errors rather than thrown, so the route can hand them
 * straight to the 422 envelope and the form can bind them to the field that is
 * wrong. Keyed by the *later* field of each pair: that is the one someone is
 * usually editing when the order breaks.
 *
 * Compared on the date part alone. Every stored window sits at UTC midnight and
 * the form works in whole days, so comparing the timestamps would be comparing
 * a precision the domain does not have.
 */
export function windowDateErrors(
  window: EvaluationWindowDates,
): Record<string, string> | null {
  const opens = dayOf(window.opensOn);
  const closes = dayOf(window.closesOn);
  const report = dayOf(window.reportDate);
  const errors: Record<string, string> = {};

  if (closes <= opens) {
    errors.closesOn = "An evaluation has to close after it opens.";
  }
  // Equal is allowed: reports the same day the window shuts is a real choice,
  // and the rule being broken is only ever "before there is anything to report".
  if (report < closes) {
    errors.reportDate = "Reports cannot be available before the window closes.";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** ISO date part, which is what the stored dates and a date input agree on. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * A date input's `YYYY-MM-DD` in the shape the store holds.
 *
 * Every seeded window is UTC midnight, so normalising here keeps one format in
 * the table instead of two that sort the same and compare differently.
 */
export function toStoredDate(day: string): string {
  return `${day.slice(0, 10)}T00:00:00.000Z`;
}
