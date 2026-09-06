"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchCostSheets } from "../services/cost-service";
import type { CostQueryParams } from "../types";

export function useCostSheets(params: CostQueryParams) {
  return useQuery({
    queryKey: queryKeys.costs.list(params),
    queryFn: () => fetchCostSheets(params),
  });
}
