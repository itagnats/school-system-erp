import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listSemesters } from "@/server/services";

/** GET /api/semesters */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listSemesters({
      ...query,
      status: readFilter(params, "status"),
      academicYear: readFilter(params, "academicYear"),
    }),
  );
}
