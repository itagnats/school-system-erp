import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listEnrollments } from "@/server/services";

/** GET /api/enrollment - the joined roster view. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listEnrollments({
      ...query,
      programId: readFilter(params, "programId"),
      courseId: readFilter(params, "courseId"),
      semester: readFilter(params, "semester"),
      status: readFilter(params, "status"),
      evaluationGroupId: readFilter(params, "evaluationGroupId"),
    }),
  );
}
