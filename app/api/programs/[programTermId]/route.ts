import { NextResponse } from "next/server";
import { programTermUpdateSchema } from "@/lib/api/contracts";
import { handleItem, handleRemoval, jsonError, notFound } from "@/server/http";
import { deleteProgramTerm, getProgramTerm, updateProgramTerm } from "@/server/services";
import { parseBody, readJson } from "@/server/validation";

/** GET /api/programs/:programTermId - curriculum, roster and the profit working. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;
  return handleItem(request, () => getProgramTerm(programTermId), "Program term");
}

/**
 * PATCH /api/programs/:programTermId
 *
 * Changing the package price recomputes revenue, profit and margin on the
 * server, which is the point: pricing is a decision, and the screen should show
 * what the decision does.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;

  const parsed = parseBody(programTermUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateProgramTerm(programTermId, parsed.data);
  if (!updated) return notFound("Program term");

  return NextResponse.json(updated);
}

/**
 * DELETE /api/programs/:programTermId
 *
 * Refused while the term has members or an invoice names it. A term in
 * `planning` with nobody in it is the case this exists for.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;
  return handleRemoval(deleteProgramTerm(programTermId), "Program term");
}
