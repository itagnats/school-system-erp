import { NextResponse } from "next/server";
import { programCostSheetUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { getProgramCostSheetByTerm, updateProgramCostSheet } from "@/server/services";

/**
 * The indirect cost sheet for one programme term (direction.md 11, 13).
 *
 * Addressed by the programme term rather than by the sheet's own id, because
 * the term is what a caller already has: there is exactly one sheet per term,
 * so a second identifier would only be a second thing to look up.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;
  return handleItem(
    request,
    () => getProgramCostSheetByTerm(programTermId),
    "Programme cost sheet",
  );
}

/** PATCH - markup, rounding step, driver or status, with everything recomputed. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;

  const parsed = parseBody(programCostSheetUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const current = getProgramCostSheetByTerm(programTermId);
  if (!current) return notFound("Programme cost sheet");

  const updated = updateProgramCostSheet(current.sheet.id, parsed.data);
  if (!updated) return notFound("Programme cost sheet");

  return NextResponse.json(updated);
}
