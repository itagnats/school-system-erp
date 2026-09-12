import { NextResponse } from "next/server";
import { catalogueGroupCreateSchema } from "@/lib/api/contracts";
import { jsonError } from "@/server/http";
import { readFilter } from "@/server/query";
import { delayFor, readSimulate } from "@/server/simulate";
import { parseBody, readJson } from "@/server/validation";
import { createCatalogueGroup, listCatalogueGroups } from "@/server/services";

/**
 * GET /api/cost-catalog - the whole catalogue, as a tree.
 *
 * Not `handleList`: that helper speaks the shared paginated contract, and this
 * endpoint deliberately does not paginate (direction.md §12a). The demo switch
 * and the artificial latency are still honoured, because the screen has the
 * same four states as any other.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const simulate = readSimulate(params);
  await delayFor(simulate);

  if (simulate === "error") {
    return jsonError(500, "Simulated failure, requested by _simulate=error");
  }
  if (simulate === "empty") {
    return NextResponse.json({ groups: [] });
  }

  return NextResponse.json({
    groups: listCatalogueGroups({
      search: (params.get("search") ?? "").trim(),
      status: readFilter(params, "status"),
      kind: readFilter(params, "kind"),
    }),
  });
}

/** POST /api/cost-catalog - a new master cost group. */
export async function POST(request: Request) {
  const parsed = parseBody(catalogueGroupCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  return NextResponse.json(createCatalogueGroup(parsed.data), { status: 201 });
}
