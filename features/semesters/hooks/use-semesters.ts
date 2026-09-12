"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchSemester, fetchSemesters } from "../services/semester-service";
import type { SemesterQueryParams } from "../types";

export function useSemesters(params: SemesterQueryParams) {
  return useQuery({
    queryKey: queryKeys.semesters.list(params),
    queryFn: () => fetchSemesters(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}

export function useSemester(code: string) {
  return useQuery({
    queryKey: queryKeys.semesters.detail(code),
    queryFn: () => fetchSemester(code),
    enabled: Boolean(code),
  });
}
