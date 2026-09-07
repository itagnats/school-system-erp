"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import {
  fetchEvaluationResults,
  fetchStudentReport,
} from "../services/report-service";

export function useEvaluationResults(setupId: string) {
  return useQuery({
    queryKey: queryKeys.evaluation.results(setupId),
    queryFn: () => fetchEvaluationResults(setupId),
    enabled: Boolean(setupId),
  });
}

/**
 * One subject's report, fetched when its modal opens.
 *
 * Lazy on purpose: a course-semester has dozens of subjects and each report
 * carries a criteria breakdown and every comment. Loading all of them to render
 * a table nobody has clicked into would be most of the payload wasted.
 *
 * Reports are pure projections of a fixed dataset, so once fetched there is
 * nothing to go stale - reopening the same modal should not refetch.
 */
export function useStudentReport(setupId: string, subjectId?: string) {
  return useQuery({
    queryKey: queryKeys.evaluation.report(setupId, subjectId ?? ""),
    queryFn: () => fetchStudentReport(setupId, subjectId ?? ""),
    enabled: Boolean(setupId && subjectId),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
