"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchEnrollmentTerms } from "../services/enrollment-service";
import type { EnrollmentTermQueryParams } from "../types";

/**
 * Program terms for the enrollment screen.
 *
 * Keyed under `programs` rather than `enrollment`, because it is the program
 * list: two query keys over one endpoint would let the same rows go stale in
 * one place and not the other.
 */
export function useEnrollmentTerms(params: EnrollmentTermQueryParams) {
  return useQuery({
    queryKey: queryKeys.programTerms.list(params),
    queryFn: () => fetchEnrollmentTerms(params),
    placeholderData: keepPreviousData,
  });
}
