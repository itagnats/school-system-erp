"use client";

import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The surface a report is read and printed from (direction.md §23).
 *
 * Extracted 2026-09-19 when a student gained a way to read their own report.
 * The two callers get their document from opposite directions - the results
 * table fetches one lazily out of dozens, a student's page already has theirs
 * from the server render - but what they print has to be the same sheet. The
 * print rule keys off `data-print="report"` and on the chrome being marked
 * hidden, and two copies of that wiring is one copy that eventually prints the
 * close button.
 *
 * `window.print()` rather than a generated PDF: the browser already knows how
 * to paginate a document and produce a file, and shipping a PDF library to do
 * it worse would be a large dependency for a worse result.
 */
export function ReportSheetDialog({
  open,
  onClose,
  subtitle,
  printable,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** Who and what the sheet is about. Chrome, so it does not print. */
  subtitle: string;
  /** False while the document is still loading or failed to arrive. */
  printable: boolean;
  children: ReactNode;
}>) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        // The print rule keys off this, and on the shell being marked chrome.
        data-print="report"
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader data-print="hide">
          <DialogTitle>Evaluation report</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {children}

        {printable ? (
          <div
            data-print="hide"
            className="flex items-center justify-end gap-2 border-t border-hairline pt-3"
          >
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" />
              Download PDF
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
