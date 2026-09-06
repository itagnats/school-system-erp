import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listCourses } from "@/server/services";

/** GET /api/courses - paginated, filtered, sorted server-side. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listCourses({
      ...query,
      status: readFilter(params, "status"),
      semester: readFilter(params, "semester"),
    }),
  );
}
