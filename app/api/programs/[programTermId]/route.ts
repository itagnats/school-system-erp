import { NextResponse } from "next/server";
import { programTermUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { getProgramTerm, updateProgramTerm } from "@/server/services";
import { parseBody, readJson } from "@/server/validation";

/** GET /api/programs/:programTermId - curriculum, roster and the profit working. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programTermId: string }> },
) {
  const { programTermId } = await params;
  return handleItem(request, () => getProgramTerm(programTermId), "Programme term");
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
  if (!updated) return notFound("Programme term");

  return NextResponse.json(updated);
}
