import { NextResponse } from "next/server";
import { catalogItemCreateSchema } from "@/lib/api/contracts";
import { jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { createCatalogItem } from "@/server/services";

/**
 * POST /api/cost-catalog/:groupId/items - a new master cost item.
 *
 * Returns the whole group rather than the new item. The screen renders the
 * catalog by group, so the group is the unit the cache holds, and returning
 * the part would leave the caller to splice it into the whole.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;

  const parsed = parseBody(catalogItemCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = createCatalogItem(groupId, parsed.data);
  if (!updated) return notFound("Catalog group");

  return NextResponse.json(updated, { status: 201 });
}
