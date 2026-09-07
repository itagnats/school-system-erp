import { api, apiPath } from "@/lib/api";
import type { EvaluationResults, StudentReport } from "@/types";

/**
 * Client callers for scores and reports.
 *
 * Neither is parsed against a contract. Both are read-only projections the
 * server derives from configuration it already validates on the way in, so a
 * schema here would re-check arithmetic nobody can submit. The contract earns
 * its keep on the inbound direction.
 */

export async function fetchEvaluationResults(setupId: string): Promise<EvaluationResults> {
  return api.get<EvaluationResults>(apiPath("evaluation", setupId, "results"));
}

export async function fetchStudentReport(
  setupId: string,
  subjectId: string,
): Promise<StudentReport> {
  return api.get<StudentReport>(apiPath("evaluation", setupId, "report", subjectId));
}
