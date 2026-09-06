import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listCostSheets } from "@/server/services";

/** GET /api/costs - derived totals per sheet, not the nested groups. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listCostSheets({
      ...query,
      courseId: readFilter(params, "courseId"),
      semester: readFilter(params, "semester"),
      status: readFilter(params, "status"),
    }),
  );
}
