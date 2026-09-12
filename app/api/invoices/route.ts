import { readFilter } from "@/server/query";
import { handleList } from "@/server/http";
import { listInvoices } from "@/server/services";

/** GET /api/invoices - one row per student per semester, with derived totals. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listInvoices({
      ...query,
      status: readFilter(params, "status"),
      semester: readFilter(params, "semester"),
      programId: readFilter(params, "programId"),
      studentId: readFilter(params, "studentId"),
    }),
  );
}
