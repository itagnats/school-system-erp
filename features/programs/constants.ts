import type { Option, ProgramTermStatus, StatusTone } from "@/types";

/**
 * Programme vocabulary.
 *
 * A term status is about enrolment, not about money: a closed term can still be
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
 * Colour for a profit figure.
 *
 * Never the only signal: every place this is used states the sign in the number
 * itself, so a reader who cannot distinguish the colours still reads a minus.
 */
export function profitToneClass(netProfit: number): string {
  if (netProfit > 0) return "text-success";
  if (netProfit < 0) return "text-error";
  return "text-muted-foreground";
}
