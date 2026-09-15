import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listProgramCostSheets } from "@/server/services";

/**
 * GET /api/program-costs - the index of Cost Management (direction.md 11).
 *
 * The programme term is where a costing is finished, so this is the list the
 * cost area leads with. Course sheets list separately at /api/costs.
 */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listProgramCostSheets({
      ...query,
      programId: readFilter(params, "programId"),
      semester: readFilter(params, "semester"),
      status: readFilter(params, "status"),
    }),
  );
}
