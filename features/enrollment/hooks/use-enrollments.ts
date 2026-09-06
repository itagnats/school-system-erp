"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchEnrollments } from "../services/enrollment-service";
import type { EnrollmentQueryParams } from "../types";

export function useEnrollments(params: EnrollmentQueryParams) {
  return useQuery({
    queryKey: queryKeys.enrollment.list(params),
    queryFn: () => fetchEnrollments(params),
  });
}
