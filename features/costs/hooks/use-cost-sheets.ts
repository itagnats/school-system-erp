"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchCostSheet, fetchCostSheets } from "../services/cost-service";
import type { CostQueryParams, CostSheetDetailResponse } from "../types";

/**
 * One cost sheet, seeded from the server render.
 *
 * Both panels on the detail page read through this rather than holding their
 * own `mutation.data ?? initial`. Editing the markup and editing the lines are
 * two different mutations, and two local copies of the sheet would let the
 * totals panel and the line tables disagree about what is on the sheet.
 *
 * `initialData` means no request is made on arrival: the page already rendered
 * the sheet on the server, and this hook exists to hold what the writes return.
 */
export function useCostSheet(
  costSheetId: string,
  initialData: CostSheetDetailResponse,
) {
  return useQuery({
    queryKey: queryKeys.costs.detail(costSheetId),
    queryFn: () => fetchCostSheet(costSheetId),
    initialData,
    // The BFF stores nothing, so a background refetch would replace an edited
    // sheet with the seed (docs/decisions/why-bff.md).
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCostSheets(params: CostQueryParams) {
  return useQuery({
    queryKey: queryKeys.costs.list(params),
    queryFn: () => fetchCostSheets(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}
