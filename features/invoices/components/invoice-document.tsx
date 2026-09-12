"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HttpError } from "@/lib/api";
import { isOutstanding } from "@/lib/calculations";
import { INVOICE_STATUS_LABEL } from "../constants";
import { useUpdateInvoiceStatus } from "../hooks/use-invoice-mutations";
import type { InvoiceDetailResponse } from "../types";
import { InvoiceSheet } from "./invoice-sheet";

/**
 * One invoice: the sheet, and the two things that can be done with it.
 *
 * The page is the preview. Rather than opening the document in a dialog the way
 * a student report does, the invoice detail route *is* the document and prints
 * itself — there is nothing else on the route worth keeping on the page, so a
 * dialog would only be a second copy of the same markup to keep in step.
 *
 * Everything in this component except the sheet is marked `data-print="hide"`,
 * which is what makes the printed page carry the invoice and nothing around it.
 *
 * Server-rendered data arrives as `initial`; this is a client component only so
 * the one status transition the domain offers can be made.
 */
export function InvoiceDocument({
  initial,
}: Readonly<{ initial: InvoiceDetailResponse }>) {
  const mutation = useUpdateInvoiceStatus(initial.invoice.id);
  const detail = mutation.data ?? initial;
  const { invoice } = detail;

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  return (
    <>
      <div
        data-print="hide"
        className="mb-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-xs text-muted-foreground">
          Nothing is stored in this demo — a status change is validated and
          shaped, then discarded. Reloading starts over.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {isOutstanding(invoice.status) ? (
            <Button
              variant="outline"
              size="sm"
              loading={mutation.isPending}
              onClick={() => mutation.mutate({ status: "paid" })}
            >
              Mark as paid
            </Button>
          ) : (
            // Stated rather than hidden: a missing button leaves a reader
            // wondering whether they lack a permission.
            <p className="text-xs text-muted-foreground">
              {invoice.status === "paid"
                ? "This invoice is settled."
                : `A ${INVOICE_STATUS_LABEL[invoice.status].toLowerCase()} invoice cannot be paid.`}
            </p>
          )}

          {/* The browser's print dialog is the PDF writer. Naming the button
              after the outcome rather than the mechanism, as the student report
              does — "Print" understates what the reader gets. */}
          <Button size="sm" onClick={() => window.print()}>
            <Printer aria-hidden className="size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {fieldErrors?.status ? (
        <p
          role="alert"
          data-print="hide"
          className="mb-3 text-xs text-destructive"
        >
          {fieldErrors.status}
        </p>
      ) : null}

      <InvoiceSheet detail={detail} />
    </>
  );
}
