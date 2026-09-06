import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listEvaluationSetups } from "@/server/services";

/**
 * GET /api/evaluation
 *
 * A row is one course-semester evaluation setup. That is the grain an
 * administrator works at: groups, evaluators and the weight blend are all
 * scoped to a course in a semester, so listing anything finer would repeat the
 * same configuration once per group.
 */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listEvaluationSetups({
      ...query,
      semester: readFilter(params, "semester"),
      status: readFilter(params, "status"),
      courseId: readFilter(params, "courseId"),
    }),
  );
}
