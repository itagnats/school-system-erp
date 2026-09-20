import type { InvoiceStatus, ProgramEnrollment, ProgramTermStatus } from "@/types";

/**
 * Invoicing policy (direction.md §13b).
 *
 * There are no hand-written invoice rows here, for the same reason there are no
 * hand-written evaluation groups: an invoice is **derived from a program
 * enrollment**, so writing one by hand would produce a document that either
 * duplicates a generated one or bills a student for a term they are not in.
 * What is hand-written is the policy the generator applies.
 */

/** Days before the semester starts that an invoice is issued. */
export const ISSUE_LEAD_DAYS = 30;

/** Days an invoice is payable for, from its issue date. */
export const PAYMENT_TERM_DAYS = 30;

/**
 * The statuses each program-enrollment status can produce, weighted by
 * repetition.
 *
 * Keyed by the *enrollment* rather than the term, because what a student owes
 * follows their own standing: a pending member has been billed and has not
 * paid, which is precisely the case the revenue rule in §13a exists to stop
 * counting as earned. A withdrawn member's invoice is cancelled and contributes
 * nothing.
 */
export const INVOICE_STATUS_BY_MEMBERSHIP: Record<
  ProgramEnrollment["status"],
  InvoiceStatus[]
> = {
  pending: ["issued", "issued", "issued", "draft"],
  active: ["paid", "paid", "issued", "issued", "overdue"],
  completed: ["paid", "paid", "paid", "paid", "overdue"],
  withdrawn: ["cancelled"],
};

/**
 * A term that has not opened cannot have sent a bill.
 *
 * Applied after the membership pool above: a planning term's invoices are
 * drafts whatever the member's standing, because the cohort is not confirmed.
 * Without this, a planning term shows outstanding revenue for a cohort that
 * could still change.
 */
export const DRAFT_ONLY_TERM_STATUS: ProgramTermStatus = "planning";

/** Label for the line that reconciles the course lines with the package price. */
export const PROGRAM_FEE_LABEL = "Program fee";
