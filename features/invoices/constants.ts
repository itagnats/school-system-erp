import { APP } from "@/config/app";
import { isOutstanding, type NonPayableStatus } from "@/lib/calculations";
import type { InvoiceCreditReason, InvoiceLineKind, InvoiceStatus, Option, StatusTone } from "@/types";

/**
 * This domain's vocabulary, mapped onto the shared one.
 *
 * `StatusBadge` never learns what an invoice is; it takes a tone. Keeping the
 * mapping here is what lets a status be renamed without touching a component.
 */
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: "neutral",
  issued: "info",
  paid: "success",
  // Overdue is a warning rather than an error: the money is late, not lost, and
  // an error tone on a quarter of the table would stop meaning anything.
  overdue: "warning",
  cancelled: "neutral",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_OPTIONS: Option<InvoiceStatus>[] = (
  ["draft", "issued", "paid", "overdue", "cancelled"] as const
).map((value) => ({ value, label: INVOICE_STATUS_LABEL[value] }));

export const INVOICE_LINE_KIND_LABEL: Record<InvoiceLineKind, string> = {
  course: "Course",
  fee: "Fee",
  credit: "Credit",
};

export const INVOICE_CREDIT_REASON_LABEL: Record<InvoiceCreditReason, string> = {
  cancelled: "Cancelled before the course ran",
  dropped: "Dropped part-way through",
};

/**
 * What the description under the page title says.
 *
 * Kept beside the other copy rather than inline in the page, because it states
 * a business rule and business rules change in one place.
 */
export const INVOICE_GRAIN_NOTE =
  "One invoice per student per semester. Lines are the program curriculum; a course that was cancelled or dropped is credited back.";

/**
 * The letterhead on the printed document.
 *
 * Fictional throughout, including the domain — `.example` is reserved for
 * documentation and can never belong to anyone, which is the property that
 * matters on a page designed to look like a real bill (`scaffold.md` §12).
 */
export const INVOICE_ISSUER = {
  name: APP.fullName,
  lines: ["128 Sakura Road, Bangkok 10500", "billing@prime.example"],
} as const;

/**
 * Why an invoice's payment block is not to be acted on.
 *
 * Only `issued` and `overdue` invoices can be paid. The other three still print
 * the barcode — the document is a record of what was billed, and a payment
 * block that vanishes leaves a reader unsure whether the invoice ever had one —
 * but it is stamped and faded, and this sentence says in words what the stamp
 * says in a glance. Color and a rubber stamp are both visual; the sentence is
 * what a screen reader and a monochrome printer get.
 *
 * **This map is copy, not the rule.** Which statuses are payable is
 * `isOutstanding` in `lib/calculations/invoice.ts`, which the revenue figures
 * already use and the tests already pin; a second list here would be a second
 * definition, free to drift, and the only symptom would be a live-looking
 * barcode on the wrong document.
 *
 * So the key type is `NonPayableStatus`, which is `InvoiceStatus` minus the
 * statuses `isOutstanding` is built from — still one definition, now one the
 * compiler can read. It was `Partial<Record<InvoiceStatus, string>>`, which
 * said "some keys may be missing" when the intent was "exactly these keys are
 * present": a sixth non-payable status would have compiled straight through
 * into a live-looking barcode (`AUD-018`). Now it fails the build.
 */
export const INVOICE_NOT_PAYABLE_NOTE: Record<NonPayableStatus, string> = {
  draft: "Not yet issued. Do not pay against this document.",
  paid: "Settled. No payment is due.",
  cancelled: "Cancelled. Nothing is payable against this document.",
};

export type InvoiceStampTone = "neutral" | "success" | "error";

export interface InvoiceStamp {
  label: string;
  tone: InvoiceStampTone;
}

/**
 * The stamp across a non-payable barcode.
 *
 * One record per status rather than a label map beside a tone map: two tables
 * keyed the same way are two tables that can disagree about which keys exist,
 * and a status present in one and missing from the other would render an
 * unstyled stamp or a styled blank.
 *
 * The tones are deliberately **not** `INVOICE_STATUS_TONE`. The badge calls a
 * cancelled invoice neutral, which is right in a table where a column of red
 * would stop meaning anything. A stamp voiding a payment instruction is the
 * opposite case: it has one job, and it is the one place on the sheet where
 * "this cannot be paid" has to be unmissable.
 */
export const INVOICE_STAMP: Record<NonPayableStatus, InvoiceStamp> = {
  draft: { label: "Draft", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  cancelled: { label: "Cancelled", tone: "error" },
};

/**
 * The stamp for a status, or nothing if the invoice is payable.
 *
 * The lookup lives here rather than at the call site so that "is this payable"
 * is asked once, by `isOutstanding`, and the narrowing that follows from it is
 * the compiler's rather than a reader's. A component indexing the map directly
 * would have to be trusted to have checked first.
 */
export function invoiceStampFor(status: InvoiceStatus): InvoiceStamp | undefined {
  return isOutstanding(status) ? undefined : INVOICE_STAMP[status];
}

/** The sentence above a voided payment block, or nothing if it is payable. */
export function invoiceNotPayableNote(status: InvoiceStatus): string | undefined {
  return isOutstanding(status) ? undefined : INVOICE_NOT_PAYABLE_NOTE[status];
}

/** What the payment block tells the payer to do. */
export const INVOICE_PAY_INSTRUCTION =
  "Present this page at any payment counter, or enter the references below.";

/**
 * Printed at the foot of every sheet.
 *
 * The document is convincing on purpose, which is exactly why it has to admit
 * what it is. A portfolio piece that prints something indistinguishable from a
 * real bill and says nothing is a worse demonstration, not a better one.
 */
export const INVOICE_SHEET_DISCLAIMER =
  "Demonstration document. Figures are generated from a fixed seed and the payment code is not a real payment instruction.";
