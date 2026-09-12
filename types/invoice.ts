import type { SemesterCode } from "./common";

/**
 * Invoicing (direction.md §13b).
 *
 *   Programme Term -> Programme Enrollment -> Invoice -> Invoice Line
 *
 * One invoice per student per semester. A student enrols in a programme rather
 * than a course (§7a), so a bill per course would contradict what is being
 * sold; and a student taking two programmes in one term still receives one
 * document, because that is what a person receives.
 */

/**
 * `draft -> issued -> paid | overdue | cancelled`.
 *
 * Stored rather than computed against a clock. Every date in PRIME derives from
 * a fixed epoch so a build in March and a build in November agree, and an
 * `overdue` that flipped because a month passed would break that for the one
 * field where it is most visible.
 */
export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "cancelled";

/**
 * Why a line is on the invoice.
 *
 * `course` is what the package buys, `fee` reconciles the course lines with the
 * package price, and `credit` gives back what a student did not complete. The
 * kind is carried rather than inferred from the sign, because a reader of the
 * document should not have to work out what a negative number means.
 */
export type InvoiceLineKind = "course" | "fee" | "credit";

/** Why a credit was given. Absent on lines that are not credits. */
export type InvoiceCreditReason = "cancelled" | "dropped";

export interface InvoiceLine {
  id: string;
  kind: InvoiceLineKind;
  /** Shown as the line's label. */
  description: string;
  /** Present on `course` lines and on the credit that reverses one. */
  courseId?: string;
  courseCode?: string;
  /** Credit hours behind a course line, for the arithmetic to be legible. */
  credits?: number;
  /** Rate per credit hour applied to this line. */
  creditRate?: number;
  creditReason?: InvoiceCreditReason;
  /** Share of the course line given back, 0-100. Credits only. */
  creditPercent?: number;
  /** Negative on a credit line, positive otherwise. */
  amount: number;
}

export interface Invoice {
  id: string;
  /** Human-facing document number, e.g. `INV-2026-0142`. Unique. */
  number: string;
  studentId: string;
  semesterCode: SemesterCode;
  /**
   * The programme terms this invoice bills for.
   *
   * Plural because the grain is the student-semester, not the programme. The
   * current seed gives each student one programme, so this holds one id — the
   * shape is what stops a second programme becoming a second invoice.
   */
  programTermIds: string[];
  status: InvoiceStatus;
  issuedOn: string;
  dueOn: string;
  /** When the invoice was marked paid. Absent unless status is `paid`. */
  paidOn?: string;
  currency: string;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Output of the invoice calculation layer.
 *
 * Totals are derived from the lines rather than stored beside them. A stored
 * total is a second source of truth that agrees with the lines right up until
 * someone edits one.
 */
export interface InvoiceTotals {
  /** Course lines plus fee lines, before credits. */
  subtotal: number;
  /** Sum of the credit lines, as a positive number. */
  creditTotal: number;
  /** subtotal - creditTotal. */
  total: number;
}

/** Row shape for the invoices table. A list needs labels, not foreign keys. */
export interface InvoiceListItem {
  id: string;
  number: string;
  studentId: string;
  studentName: string;
  /** The student's human-facing code, e.g. `ST-2026-001`. */
  studentCode: string;
  semesterCode: SemesterCode;
  programCode: string;
  programName: string;
  status: InvoiceStatus;
  issuedOn: string;
  dueOn: string;
  currency: string;
  subtotal: number;
  creditTotal: number;
  total: number;
}

export interface InvoiceDetail {
  invoice: Invoice;
  totals: InvoiceTotals;
  studentName: string;
  studentCode: string;
  programCode: string;
  programName: string;
  semesterName: string;
}

/**
 * What a programme term was actually billed, for §13a.
 *
 * Only what the invoices say. The list revenue it gets compared against —
 * package price multiplied by head count — is computed by the profit
 * calculation, because it is a property of the price rather than of any
 * invoice, and deriving it in both places would be two sources for one number.
 */
export interface InvoicedRevenue {
  revenue: number;
  /** Invoiced and paid. */
  collected: number;
  /** Invoiced, not cancelled, not yet paid. Overdue counts here. */
  outstanding: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface InvoiceListFilters {
  search?: string;
  status?: InvoiceStatus | "all";
  semester?: SemesterCode | "all";
  programId?: string | "all";
}
