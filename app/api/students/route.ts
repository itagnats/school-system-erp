import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listStudents } from "@/server/services";

/** GET /api/students - returns summaries, not full profiles. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listStudents({
      ...query,
      program: readFilter(params, "program"),
      yearLevel: readFilter(params, "yearLevel"),
      semester: readFilter(params, "semester"),
    }),
  );
}
