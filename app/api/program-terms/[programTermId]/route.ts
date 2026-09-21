import { NextResponse } from "next/server";
import { programTermUpdateSchema } from "@/lib/api/contracts";
import { handleItem, handleRemoval, jsonError, notFound } from "@/server/http";
import { deleteProgramTerm, getProgramTerm, updateProgramTerm } from "@/server/services";
import { parseBody, readJson } from "@/server/validation";

/**
 * One program term (moved from `/api/programs/:id` on 2026-09-21, when
 * programs became a resource of their own).
 */

/** GET /api/program-terms/:programTermId - curriculum and roster. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;
  return handleItem(request, () => getProgramTerm(programTermId), "Program term");
}

/**
 * PATCH /api/program-terms/:programTermId - price, status, and the curriculum.
 *
 * Two shapes of refusal, and they are different failures. The contract catches
 * what can be judged from the request alone: a duplicate course, an empty
 * curriculum, a price out of range. The service catches what needs the store:
 * a course that does not exist, one the semester does not run, one that has
 * been archived. Both come back as 422 with the message under the field, and
 * the curriculum's field is `courseIds`.
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

  const result = updateProgramTerm(programTermId, parsed.data);
  if (!result) return notFound("Program term");
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/program-terms/:programTermId
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
