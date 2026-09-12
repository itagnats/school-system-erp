"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchInvoices } from "../services/invoice-service";
import type { InvoiceQueryParams } from "../types";

export function useInvoices(params: InvoiceQueryParams) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => fetchInvoices(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}
