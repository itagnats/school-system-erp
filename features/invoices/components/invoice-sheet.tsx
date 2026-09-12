"use client";

import { SakuraMark } from "@/components/decor";
import { StatusBadge } from "@/components/shared";
import { buildPaymentCode, isOutstanding } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceLine } from "@/types";
import {
  INVOICE_CREDIT_REASON_LABEL,
  INVOICE_ISSUER,
  INVOICE_NOT_PAYABLE_NOTE,
  INVOICE_PAY_INSTRUCTION,
  INVOICE_SHEET_DISCLAIMER,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
} from "../constants";
import type { InvoiceDetailResponse } from "../types";
import { PaymentBarcode } from "./payment-barcode";

/**
 * The invoice as a document (direction.md §13b).
 *
 * This is the sheet a student receives, and it is what the page prints — the
 * preview and the PDF are the same markup rather than a screen view and a
 * separate export, which is the only way the two cannot drift apart. The print
 * rule in `globals.css` keys off `data-print="document"`: the chrome around it
 * disappears and this article sizes itself to the page box.
 *
 * `window.print()` rather than a generated PDF, for the same reason the student
 * report takes that route — the browser already paginates a document and writes
 * a file, and a PDF library would be a large dependency doing it worse.
 *
 * ## What it refuses to hide
 *
 * - **The lines.** A total says what is owed; the lines say what it is owed
 *   for, at how many credit hours, and what came back when a course did not
 *   run. Same argument the cost sheet makes for showing its own working.
 * - **The credits, separately.** Netting them into the total would produce a
 *   figure lower than the package price with nothing on the page explaining
 *   why.
 * - **That it is a demonstration.** The disclaimer at the foot is not a
 *   disclaimer about accuracy; it is there because a convincing bill that does
 *   not say what it is would be the wrong thing to have built.
 */
export function InvoiceSheet({
  detail,
}: Readonly<{ detail: InvoiceDetailResponse }>) {
  const { invoice, totals } = detail;
  const money = (value: number) => formatCurrency(value, invoice.currency);
  // One definition of payable, shared with the revenue figures: money that is
  // outstanding is exactly the money a payment code should be able to settle.
  const payable = isOutstanding(invoice.status);

  return (
    <article
      // The print rule keys off this. See globals.css.
      data-print="document"
      className="rounded-lg border border-hairline bg-card p-5 text-foreground shadow-xs sm:p-7"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SakuraMark className="size-5 text-seal" />
            <p className="text-base font-medium">{INVOICE_ISSUER.name}</p>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {INVOICE_ISSUER.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-medium tracking-widest text-primary-strong uppercase">
            Invoice
          </p>
          <p className="mt-0.5 text-lg font-medium" data-numeric>
            {invoice.number}
          </p>
          <div className="mt-1.5 flex justify-end">
            <StatusBadge
              tone={INVOICE_STATUS_TONE[invoice.status]}
              label={INVOICE_STATUS_LABEL[invoice.status]}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-4 border-b border-hairline py-4 sm:grid-cols-2">
        <div className="min-w-0">
          <Caption>Billed to</Caption>
          <p className="mt-1 font-medium">{detail.studentName}</p>
          <p className="text-xs text-muted-foreground" data-numeric>
            {detail.studentCode}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {detail.programCode} — {detail.programName}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:justify-self-end">
          <Meta label="Semester" value={detail.semesterName} />
          <Meta label="Issued" value={formatDate(invoice.issuedOn)} />
          <Meta label="Due" value={formatDate(invoice.dueOn)} />
          <Meta
            label="Paid"
            value={invoice.paidOn ? formatDate(invoice.paidOn) : "—"}
          />
        </dl>
      </div>

      <section className="py-4">
        <Caption>Lines</Caption>
        <p className="mt-1 text-xs text-muted-foreground">
          The programme curriculum, priced per credit hour, less anything
          credited back.
        </p>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline text-left text-muted-foreground">
                <th scope="col" className="py-1.5 pr-2 font-normal">
                  Description
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Credits
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                  Rate
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <SheetLine
                  key={line.id}
                  line={line}
                  currency={invoice.currency}
                />
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-3 ml-auto grid max-w-xs gap-1 text-xs">
          <Total label="Subtotal" value={money(totals.subtotal)} />
          <Total
            label="Credits"
            value={totals.creditTotal === 0 ? "—" : `−${money(totals.creditTotal)}`}
          />
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-hairline pt-2">
            <dt className="text-sm font-medium">Total due</dt>
            <dd className="text-base font-semibold" data-numeric>
              {money(totals.total)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-hairline bg-surface-sunken p-4">
        <Caption>Payment</Caption>
        {payable ? (
          <>
            <p className="mt-1 mb-3 text-xs text-muted-foreground">
              {INVOICE_PAY_INSTRUCTION}
            </p>
            <PaymentBarcode
              code={buildPaymentCode({
                studentCode: detail.studentCode,
                invoiceNumber: invoice.number,
                total: totals.total,
              })}
              amountLabel={money(totals.total)}
            />
          </>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {INVOICE_NOT_PAYABLE_NOTE[invoice.status]}
          </p>
        )}
      </section>

      <p className="mt-4 border-t border-hairline pt-3 text-[10px] text-muted-foreground">
        {INVOICE_SHEET_DISCLAIMER}
      </p>
    </article>
  );
}

function SheetLine({
  line,
  currency,
}: Readonly<{ line: InvoiceLine; currency: string }>) {
  const isCredit = line.kind === "credit";
  const tone = isCredit ? "text-warning-soft-foreground" : undefined;

  return (
    <tr className="border-b border-hairline/60">
      <td className="py-1.5 pr-2">
        <span className={tone}>{line.description}</span>
        {line.creditReason ? (
          <p className="text-[10px] text-muted-foreground">
            {INVOICE_CREDIT_REASON_LABEL[line.creditReason]} ·{" "}
            {line.creditPercent}% back
          </p>
        ) : null}
      </td>
      <td className="py-1.5 pr-2 text-right text-muted-foreground" data-numeric>
        {line.credits ?? "—"}
      </td>
      <td className="py-1.5 pr-2 text-right text-muted-foreground" data-numeric>
        {line.creditRate ? formatCurrency(line.creditRate, currency) : "—"}
      </td>
      <td className={`py-1.5 text-right font-medium ${tone ?? ""}`} data-numeric>
        {formatCurrency(line.amount, currency)}
      </td>
    </tr>
  );
}

function Caption({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <h3 className="text-[10px] font-medium tracking-wide text-primary-strong uppercase">
      {children}
    </h3>
  );
}

function Meta({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right" data-numeric>
        {value}
      </dd>
    </>
  );
}

function Total({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd data-numeric>{value}</dd>
    </div>
  );
}
