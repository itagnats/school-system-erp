import { NextResponse } from "next/server";
import { sheetGroupAddSchema, sheetItemAddSchema } from "@/lib/api/contracts";
import { jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { addGroupToSheet, addItemToSheet, isSheetWriteError } from "@/server/services";

/**
 * POST /api/costs/:costSheetId/items - copy a catalogue item onto the sheet.
 *
 * A group is added through the same route, distinguished by the body carrying
 * `catalogueGroupId` instead of `catalogueItemId`. Both are "add something to
 * this sheet from the catalogue", both return the whole recomputed sheet, and a
 * second route would differ only in its name.
 *
 * The response is the sheet with its breakdown recalculated, never an
 * acknowledgement: adding a line changes the total, the group shares and the
 * per-student figure, and the client must not derive those itself.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ costSheetId: string }> },
) {
  const { costSheetId } = await params;
  const body = await readJson(request);

  const isGroup =
    typeof body === "object" && body !== null && "catalogueGroupId" in body;

  const parsed = isGroup
    ? parseBody(sheetGroupAddSchema, body)
    : parseBody(sheetItemAddSchema, body);

  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = isGroup
    ? addGroupToSheet(costSheetId, parsed.data as { catalogueGroupId: string })
    : addItemToSheet(costSheetId, parsed.data as Parameters<typeof addItemToSheet>[1]);

  if (!result) return notFound("Cost sheet");
  if (isSheetWriteError(result)) {
    return jsonError(422, "That cannot be added", result.fieldErrors);
  }

  return NextResponse.json(result, { status: 201 });
}
