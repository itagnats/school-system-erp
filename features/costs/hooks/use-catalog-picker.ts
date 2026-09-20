"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import {
  fetchCatalogForPicker,
  type CatalogPickerParams,
} from "../services/catalog-picker-service";

/**
 * The catalog, for the "Add from catalog" dialog on a cost sheet.
 *
 * The read-only twin of `features/cost-catalog/hooks/use-catalog.ts`, kept
 * separate so `features/costs/` imports no other feature (`AUD-012`). The key
 * is `queryKeys.catalog.list` either way, so the two share one cache entry and
 * opening the dialog after visiting the catalog screen is already warm.
 */
export function useCatalogPicker(params: CatalogPickerParams = {}) {
  return useQuery({
    queryKey: queryKeys.catalog.list(params),
    queryFn: () => fetchCatalogForPicker(params),
  });
}
