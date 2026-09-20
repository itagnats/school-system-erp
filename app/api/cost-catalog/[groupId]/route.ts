import { NextResponse } from "next/server";
import { catalogGroupUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { getCatalogGroup, updateCatalogGroup } from "@/server/services";

/** GET /api/cost-catalog/:groupId - one master group and its items. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  return handleItem(request, () => getCatalogGroup(groupId), "Catalog group");
}

/**
 * PATCH /api/cost-catalog/:groupId - rename, redescribe or archive.
 *
 * Archiving is the only way a group leaves circulation: sheets hold copies and
 * would survive a delete, but their provenance would point at nothing
 * (direction.md §12a). There is no DELETE on this route for that reason.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;

  const parsed = parseBody(catalogGroupUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateCatalogGroup(groupId, parsed.data);
  if (!updated) return notFound("Catalog group");

  return NextResponse.json(updated);
}
