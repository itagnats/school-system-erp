"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchEnrolmentTerms } from "../services/enrollment-service";
import type { EnrolmentTermQueryParams } from "../types";

/**
 * Programme terms for the enrolment screen.
 *
 * Keyed under `programs` rather than `enrollment`, because it is the programme
 * list: two query keys over one endpoint would let the same rows go stale in
 * one place and not the other.
 */
export function useEnrolmentTerms(params: EnrolmentTermQueryParams) {
  return useQuery({
    queryKey: queryKeys.programs.list(params),
    queryFn: () => fetchEnrolmentTerms(params),
    placeholderData: keepPreviousData,
  });
}
