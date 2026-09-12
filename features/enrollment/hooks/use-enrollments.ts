"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchEnrollments } from "../services/enrollment-service";
import type { EnrollmentQueryParams } from "../types";

export function useEnrollments(params: EnrollmentQueryParams) {
  return useQuery({
    queryKey: queryKeys.enrollment.list(params),
    queryFn: () => fetchEnrollments(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}
