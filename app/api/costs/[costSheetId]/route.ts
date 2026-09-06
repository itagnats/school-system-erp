import { NextResponse } from "next/server";
import { costSheetUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { getCostSheet, updateCostSheet } from "@/server/services";

/** GET /api/costs/:costSheetId - the sheet plus its full breakdown. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ costSheetId: string }> },
) {
  const { costSheetId } = await params;
  return handleItem(request, () => getCostSheet(costSheetId), "Cost sheet");
}

/** PATCH /api/costs/:costSheetId - adjust the inputs and get the total back. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ costSheetId: string }> },
) {
  const { costSheetId } = await params;

  const parsed = parseBody(costSheetUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateCostSheet(costSheetId, parsed.data);
  if (!updated) return notFound("Cost sheet");

  return NextResponse.json(updated);
}
