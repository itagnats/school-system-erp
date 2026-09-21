import type { Option, ProgramStatus, ProgramTermStatus, StatusTone } from "@/types";

/**
 * Program vocabulary.
 *
 * A term status is about enrollment, not about money: a closed term can still be
 * profitable and an open one can still be losing. Profit gets its own tone
 * below, driven by the number rather than by the state.
 */

export const TERM_STATUS_TONE: Record<ProgramTermStatus, StatusTone> = {
  planning: "neutral",
  open: "success",
  closed: "info",
};

export const TERM_STATUS_LABEL: Record<ProgramTermStatus, string> = {
  planning: "Planning",
  open: "Open",
  closed: "Closed",
};

export const TERM_STATUS_OPTIONS: Option<ProgramTermStatus>[] = (
  ["planning", "open", "closed"] as const
).map((value) => ({ value, label: TERM_STATUS_LABEL[value] }));

/**
 * A program's own status, which is not a term's (added 2026-09-21).
 *
 * `draft | active | archived` is the same union a course carries, and it means
 * the same thing: whether the school is offering this at all. A term's
 * `planning | open | closed` is about one semester's enrollment window. They
 * are separate vocabularies on purpose - an active program can hold a closed
 * term, and an archived one still has the terms it ran.
 */
export const PROGRAM_STATUS_TONE: Record<ProgramStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  archived: "info",
};

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const PROGRAM_STATUS_OPTIONS: Option<ProgramStatus>[] = (
  ["draft", "active", "archived"] as const
).map((value) => ({ value, label: PROGRAM_STATUS_LABEL[value] }));

// `profitToneClass` lived here until 2026-09-20 and now lives in
// `features/costs/constants.ts`. Profitability left the Academic menu with
// §13a, and this file had no caller for it afterwards — the same move
// `AUD-012` made for the drift constants, and for the same reason: a helper
// belongs to the screens that use it, not to the screen it was born on.
