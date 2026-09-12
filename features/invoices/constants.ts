import { APP } from "@/config/app";
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
  "One invoice per student per semester. Lines are the programme curriculum; a course that was cancelled or dropped is credited back.";

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
 * Why an invoice carries no payment barcode.
 *
 * Only `issued` and `overdue` invoices can be paid, so only those print a
 * scannable code — a barcode on a settled bill invites a second payment, and
 * one on a draft invites a payment against a document that was never sent.
 * Each of the other three states says which it is, because a blank space where
 * a payment block belongs reads as a rendering fault.
 *
 * **This map is copy, not the rule.** Which statuses are payable is
 * `isOutstanding` in `lib/calculations/invoice.ts`, which the revenue figures
 * already use and the tests already pin; a second list here would be a second
 * definition, free to drift, and the only symptom would be a barcode on the
 * wrong document. Hence `Partial` — the payable states are absent by
 * construction rather than present holding `null`.
 */
export const INVOICE_NOT_PAYABLE_NOTE: Partial<Record<InvoiceStatus, string>> = {
  draft: "Not yet issued. This document carries no payment code until it is.",
  paid: "Settled. No payment is due.",
  cancelled: "Cancelled. Nothing is payable against this document.",
};

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
