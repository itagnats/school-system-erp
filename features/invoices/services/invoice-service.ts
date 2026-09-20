import { api, apiPath } from "@/lib/api";
import { invoiceListSchema } from "@/lib/api/contracts";
import type { PaginatedResult } from "@/types";
import type { InvoiceStatusUpdateInput } from "@/lib/api/contracts";
import type { InvoiceDetailResponse, InvoiceQueryParams, InvoiceRow } from "../types";

export async function fetchInvoices(
  params: InvoiceQueryParams,
): Promise<PaginatedResult<InvoiceRow>> {
  const raw = await api.get<unknown>("invoices", { query: { ...params } });
  return invoiceListSchema.parse(raw) as PaginatedResult<InvoiceRow>;
}

export async function fetchInvoice(invoiceId: string): Promise<InvoiceDetailResponse> {
  return api.get<InvoiceDetailResponse>(apiPath("invoices", invoiceId));
}

/**
 * Move an invoice to another status.
 *
 * The response carries the whole document back rather than an acknowledgment,
 * because the status is not the only thing that changes: marking an invoice
 * paid also settles its payment date, and the server is where that is decided.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  input: InvoiceStatusUpdateInput,
): Promise<InvoiceDetailResponse> {
  return api.patch<InvoiceDetailResponse>(apiPath("invoices", invoiceId), {
    body: input,
  });
}
