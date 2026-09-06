"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchSemester, fetchSemesters } from "../services/semester-service";
import type { SemesterQueryParams } from "../types";

export function useSemesters(params: SemesterQueryParams) {
  return useQuery({
    queryKey: queryKeys.semesters.list(params),
    queryFn: () => fetchSemesters(params),
  });
}

export function useSemester(code: string) {
  return useQuery({
    queryKey: queryKeys.semesters.detail(code),
    queryFn: () => fetchSemester(code),
    enabled: Boolean(code),
  });
}
