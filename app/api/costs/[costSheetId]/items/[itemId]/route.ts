import { NextResponse } from "next/server";
import { sheetItemUpdateSchema } from "@/lib/api/contracts";
import { jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { realignSheetItem, removeSheetItem, updateSheetItem } from "@/server/services";

interface RouteParams {
  params: Promise<{ costSheetId: string; itemId: string }>;
}

/**
 * PATCH /api/costs/:costSheetId/items/:itemId - change this sheet's copy.
 *
 * `?realign=1` instead resets the unit price to the catalogue's current one.
 * It is a query flag rather than a body field because it is not a value being
 * set: the caller is asking the server what the price should be, which is the
 * one thing a body carrying a price could not express honestly.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { costSheetId, itemId } = await params;

  if (new URL(request.url).searchParams.get("realign") === "1") {
    const realigned = realignSheetItem(costSheetId, itemId);
    if (!realigned) return notFound("Catalogue item for this line");
    return NextResponse.json(realigned);
  }

  const parsed = parseBody(sheetItemUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateSheetItem(costSheetId, itemId, parsed.data);
  if (!updated) return notFound("Cost item");

  return NextResponse.json(updated);
}

/** DELETE /api/costs/:costSheetId/items/:itemId - drop a line. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { costSheetId, itemId } = await params;

  const updated = removeSheetItem(costSheetId, itemId);
  if (!updated) return notFound("Cost item");

  return NextResponse.json(updated);
}
