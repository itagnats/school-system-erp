import { NextResponse } from "next/server";
import { invoiceStatusUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { getInvoice, isTransitionError, updateInvoiceStatus } from "@/server/services";

/** GET /api/invoices/:invoiceId - the document, its lines and its totals. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  return handleItem(request, () => getInvoice(invoiceId), "Invoice");
}

/**
 * PATCH /api/invoices/:invoiceId - move the invoice to another status.
 *
 * Two validations, and the second is the one that matters. The schema checks
 * the request is well formed; the service checks the move is legal, because a
 * status is exactly the field where a perfectly well-formed request can still
 * be nonsense - paying a cancelled invoice, or re-issuing a paid one.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;

  const parsed = parseBody(invoiceStatusUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateInvoiceStatus(invoiceId, parsed.data);
  if (!updated) return notFound("Invoice");
  if (isTransitionError(updated)) {
    return jsonError(422, "That status change is not allowed", updated.fieldErrors);
  }

  return NextResponse.json(updated);
}
