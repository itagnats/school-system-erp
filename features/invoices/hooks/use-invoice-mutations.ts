"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InvoiceStatusUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import { updateInvoiceStatus } from "../services/invoice-service";
import type { InvoiceDetailResponse } from "../types";

/**
 * Mark an invoice paid.
 *
 * Not optimistic. A status change looks like the single-field write optimism is
 * for, but it is not: the server also settles the payment date and may refuse
 * the move entirely, and an invoice that flashed "Paid" before being told the
 * transition was illegal would be worse than one that waited.
 *
 * The response is written into the cache rather than invalidated - the BFF
 * stores nothing, so a refetch would return the seed and visibly undo the
 * change a second after it was made. See docs/decisions/why-bff.md.
 */
export function useUpdateInvoiceStatus(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InvoiceStatusUpdateInput) =>
      updateInvoiceStatus(invoiceId, input),
    onSuccess: (detail: InvoiceDetailResponse) => {
      queryClient.setQueryData(queryKeys.invoices.detail(invoiceId), detail);
      // The list carries a status column and a total, so the row people came
      // from has to agree with the document they are looking at.
      queryClient.setQueriesData<{ items: { id: string; status: string }[] }>(
        { queryKey: queryKeys.invoices.all },
        (cached) =>
          cached && "items" in cached
            ? {
                ...cached,
                items: cached.items.map((row) =>
                  row.id === invoiceId ? { ...row, status: detail.invoice.status } : row,
                ),
              }
            : cached,
      );
      toast.success(`Invoice ${detail.invoice.number} marked paid`);
    },
    onError: () => {
      toast.error("That status change could not be applied.");
    },
  });
}
