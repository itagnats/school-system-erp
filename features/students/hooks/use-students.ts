"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchStudent, fetchStudents } from "../services/student-service";
import type { StudentQueryParams } from "../types";

export function useStudents(params: StudentQueryParams) {
  return useQuery({
    queryKey: queryKeys.students.list(params),
    queryFn: () => fetchStudents(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: queryKeys.students.detail(studentId),
    queryFn: () => fetchStudent(studentId),
    enabled: Boolean(studentId),
  });
}
