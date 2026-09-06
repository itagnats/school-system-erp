import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listProgramTerms } from "@/server/services";

/**
 * GET /api/programs
 *
 * A row is one programme term, not one programme: the money question is always
 * asked of a semester, so the term is the unit worth listing.
 */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listProgramTerms({
      ...query,
      status: readFilter(params, "status"),
      semester: readFilter(params, "semester"),
    }),
  );
}
