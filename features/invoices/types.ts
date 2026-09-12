import type {
  Invoice,
  InvoiceStatus,
  InvoiceTotals,
  ListQuery,
  SemesterCode,
} from "@/types";

export interface InvoiceQueryParams extends ListQuery {
  status?: InvoiceStatus;
  semester?: SemesterCode;
  programId?: string;
  studentId?: string;
}

/**
 * The row an invoice table shows.
 *
 * Totals arrive derived. Sending the lines so the browser could add them up
 * would put the same arithmetic in two places, and the one in the browser would
 * be the one nobody tested.
 */
export interface InvoiceRow {
  id: string;
  number: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  semesterCode: string;
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

/** What the detail endpoint returns: the document, its totals and its labels. */
export interface InvoiceDetailResponse {
  invoice: Invoice;
  totals: InvoiceTotals;
  studentName: string;
  studentCode: string;
  programCode: string;
  programName: string;
  semesterName: string;
}
