import { handleItem, jsonError } from "@/server/http";
import { currentPrincipal, mayReadSubjectReport } from "@/server/principal";
import { studentReport } from "@/server/services";

/**
 * GET /api/evaluation/:setupId/report/:subjectId
 *
 * One subject's report. The subject id is an enrollment for a student and a
 * synthetic staff id for a teacher or TA, which is why the route says subject
 * rather than student - the report is not student-only any more (direction.md
 * 16).
 *
 * **Guarded here rather than at the edge** (added 2026-09-19). `proxy.ts`
 * matches by prefix and the rule this needs is about a segment behind a dynamic
 * id, so the table cannot express it: `/api/evaluation` is open to every role
 * for reads because the queue and the form need it. Who may read a *report* is
 * an evaluator, or the one student the subject belongs to - which is the same
 * ownership shape `/api/students/<id>` already carries, and the same warning:
 * passing the proxy is not the same as being allowed.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ setupId: string; subjectId: string }> },
) {
  const { setupId, subjectId } = await params;

  const principal = await currentPrincipal();
  if (!principal) {
    return jsonError(401, "Sign in to continue", { status: "Sign in to continue" });
  }
  if (!mayReadSubjectReport(principal, subjectId)) {
    // Says nothing about whether that subject exists. A refusal that
    // distinguished a missing id from somebody else's would be a way to
    // enumerate the cohort.
    return jsonError(403, "That report is not yours", {
      status: "That report is not yours",
    });
  }

  return handleItem(request, () => studentReport(setupId, subjectId), "Report");
}
