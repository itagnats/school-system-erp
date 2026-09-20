import { NextResponse } from "next/server";
import { catalogItemUpdateSchema } from "@/lib/api/contracts";
import { jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { deleteCatalogItem, isBlocked, updateCatalogItem } from "@/server/services";

interface RouteParams {
  params: Promise<{ groupId: string; itemId: string }>;
}

/** PATCH /api/cost-catalog/:groupId/items/:itemId - edit or archive an item. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { groupId, itemId } = await params;

  const parsed = parseBody(catalogItemUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateCatalogItem(groupId, itemId, parsed.data);
  if (!updated) return notFound("Catalog item");

  return NextResponse.json(updated);
}

/**
 * DELETE /api/cost-catalog/:groupId/items/:itemId
 *
 * Allowed only while nothing has copied it. Once a sheet has, the answer is a
 * 409 telling the caller to archive instead — the sheets would survive the
 * delete, since they hold copies, but their provenance would point at nothing
 * and the catalog would stop being able to answer the one question it exists
 * for (direction.md §12a).
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { groupId, itemId } = await params;

  const result = deleteCatalogItem(groupId, itemId);
  if (!result) return notFound("Catalog item");

  if (isBlocked(result)) {
    return jsonError(
      409,
      "That item is in use",
      {
        status: `${result.blockedBy} cost sheet${
          result.blockedBy === 1 ? " has" : "s have"
        } copied this item. Archive it instead, so those sheets keep their provenance.`,
      },
    );
  }

  return NextResponse.json(result);
}
