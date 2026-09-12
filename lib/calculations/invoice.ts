import type {
  EnrollmentStatus,
  InvoiceCreditReason,
  InvoiceLine,
  InvoiceStatus,
  InvoiceTotals,
} from "@/types";
import { roundMoney } from "./number";

/**
 * Invoice arithmetic (direction.md §13b).
 *
 * An invoice is the curriculum priced line by line:
 *
 *   course line   credits x CREDIT_RATE
 *   fee line      package price - sum of the course lines
 *   credit line   a share of a course line, given back
 *   total         sum of the lines
 *
 * Nothing here knows where a line came from, which is what lets the same
 * function total a generated invoice and one a form is building.
 */

/**
 * Baht per credit hour.
 *
 * **The single rate behind both a package price and an invoice.** The package
 * price is generated as `credits x CREDIT_RATE + a per-term fee`, and the
 * course lines re-derive the first half of that. Two copies of this number
 * would let a document disagree with the contract it bills, and nothing in the
 * type system would notice — which is why the generator imports this constant
 * rather than holding its own.
 */
export const CREDIT_RATE = 4200;

/**
 * What share of a course line comes back when a student does not complete it.
 *
 * A cancelled course never ran for that student, so all of it returns. A
 * dropped course consumed part of the term, so half does. A course the student
 * simply never enrolled in is absent from this map on purpose: choosing not to
 * attend what was bought is not a billing event.
 */
export const CREDIT_PERCENT: Record<InvoiceCreditReason, number> = {
  cancelled: 100,
  dropped: 50,
};

/**
 * The credit a course earns from the student's enrollment status, if any.
 *
 * Null covers three different situations that all bill in full — completing the
 * course, still being on it, and never having enrolled — because the invoice
 * does not distinguish them. Only a course that stopped early gives anything
 * back.
 */
export function creditReasonFor(
  status: EnrollmentStatus | undefined,
): InvoiceCreditReason | null {
  if (status === "cancelled") return "cancelled";
  if (status === "dropped") return "dropped";
  return null;
}

/** A course line's amount, from its credit hours. */
export function courseLineAmount(credits: number, rate: number = CREDIT_RATE): number {
  return roundMoney(credits * rate);
}

/**
 * The fee line that reconciles the course lines with the package price.
 *
 * Not a rounding plug: a package price is a negotiated figure and the courses
 * only account for part of it, so the remainder is a real charge and is
 * labelled as one. It can be zero, in which case the caller omits the line
 * rather than printing a zero.
 */
export function programmeFeeAmount(packagePrice: number, courseTotal: number): number {
  return roundMoney(packagePrice - courseTotal);
}

/** The amount of a credit line, as a negative number. */
export function creditLineAmount(
  courseAmount: number,
  reason: InvoiceCreditReason,
): number {
  return roundMoney(-(courseAmount * CREDIT_PERCENT[reason]) / 100);
}

/**
 * Total one invoice from its lines.
 *
 * Credits are summed separately and reported positive, because "credits
 * ฿8,400" reads correctly on a document and "credits -฿8,400" does not. The
 * sign lives on the line, where it belongs.
 */
export function calculateInvoiceTotals(lines: readonly InvoiceLine[]): InvoiceTotals {
  let subtotal = 0;
  let creditTotal = 0;

  for (const line of lines) {
    if (line.kind === "credit") creditTotal += Math.abs(line.amount);
    else subtotal += line.amount;
  }

  return {
    subtotal: roundMoney(subtotal),
    creditTotal: roundMoney(creditTotal),
    total: roundMoney(subtotal - creditTotal),
  };
}

/**
 * Whether an invoice's total counts as money owed.
 *
 * Overdue is outstanding. Unpaid and late are the same claim on the money, and
 * only one of them is a comment on the payer — treating them differently here
 * would understate what is owed by exactly the invoices most worth chasing.
 */
export function isOutstanding(status: InvoiceStatus): boolean {
  return status === "issued" || status === "overdue";
}

/** Whether an invoice's total counts as money received. */
export function isCollected(status: InvoiceStatus): boolean {
  return status === "paid";
}

/**
 * Whether an invoice contributes to revenue at all.
 *
 * A draft has not been sent and a cancelled invoice has been withdrawn, so
 * neither is a claim on anyone. Counting a draft would let an unsent document
 * inflate a programme's revenue.
 */
export function isBilled(status: InvoiceStatus): boolean {
  return status !== "draft" && status !== "cancelled";
}

/**
 * The status transitions the domain allows.
 *
 * Held as data rather than as a chain of ifs so the server, the UI and a test
 * all read the same table. Only one transition is offered in the UI
 * (issued -> paid); the rest exist because the seed produces every state and a
 * validator has to know which moves were legal to reach them.
 */
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

/**
 * The biller this demo bills as.
 *
 * A counter-payment barcode carries a fifteen-digit biller identifier, and
 * every real one belongs to a real organisation. This is a deliberate
 * placeholder — sequential digits, unmistakably invented — because `data/mock/`
 * holds fictional data only (`scaffold.md` §12) and a plausible-looking
 * identifier is the kind of fiction that stops being obvious once it is printed
 * on something that looks like a bill.
 */
export const DEMO_BILLER_ID = "123456789012345";

/**
 * A reference field, as a barcode can carry it.
 *
 * Punctuation is stripped rather than encoded: `ST-2026-001` is how the code is
 * written for a person, `ST2026001` is how it is scanned, and keeping the
 * hyphens would make two references for one student. Twenty characters is the
 * field width the format allows.
 */
export function paymentReference(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 20);
}

/**
 * An amount as the twelve satang digits the barcode carries.
 *
 * Zero-padded, so the field is fixed-width and a scanner can find it by
 * position. Negative totals are clamped to zero: an invoice that credits back
 * more than it charges is not a thing to pay, and a negative amount in a
 * fixed-width numeric field is not representable at all.
 */
export function amountInSatang(amount: number): string {
  const satang = Math.round(Math.max(0, roundMoney(amount)) * 100);
  return String(satang).padStart(12, "0");
}

/**
 * The four fields behind a counter-payment barcode, plus the payload itself.
 *
 * The fields are returned beside the payload rather than only inside it,
 * because the document prints both: the bars for a scanner and a labelled table
 * for the person holding the paper, who has to be able to read out a reference
 * when the scanner will not take it.
 */
export interface PaymentCode {
  payload: string;
  billerId: string;
  /** The student, so a payment can be matched to a person. */
  ref1: string;
  /** The invoice, so it can be matched to a document. */
  ref2: string;
  /** Twelve digits of satang. */
  amount: string;
}

/**
 * Build the payment code for an invoice (direction.md §13b).
 *
 * Separated by `|` rather than the carriage returns the Thai banking format
 * uses, so the payload stays inside Code Set B — see `lib/barcode/code128.ts`.
 * Nothing here is a real payment instruction; it is the shape of one.
 */
export function buildPaymentCode({
  studentCode,
  invoiceNumber,
  total,
  billerId = DEMO_BILLER_ID,
}: Readonly<{
  studentCode: string;
  invoiceNumber: string;
  total: number;
  billerId?: string;
}>): PaymentCode {
  const ref1 = paymentReference(studentCode);
  const ref2 = paymentReference(invoiceNumber);
  const amount = amountInSatang(total);

  return {
    payload: `|${billerId}|${ref1}|${ref2}|${amount}`,
    billerId,
    ref1,
    ref2,
    amount,
  };
}
