import { handleItem } from "@/server/http";
import { studentReport } from "@/server/services";

/**
 * GET /api/evaluation/:setupId/report/:subjectId
 *
 * One subject's report. The subject id is an enrollment for a student and a
 * synthetic staff id for a teacher or TA, which is why the route says subject
 * rather than student - the report is not student-only any more (direction.md
 * 16).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ setupId: string; subjectId: string }> },
) {
  const { setupId, subjectId } = await params;
  return handleItem(request, () => studentReport(setupId, subjectId), "Report");
}
