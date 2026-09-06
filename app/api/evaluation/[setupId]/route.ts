import { NextResponse } from "next/server";
import { evaluationSetupUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { getEvaluationSetup, updateEvaluationSetup } from "@/server/services";
import { parseBody, readJson } from "@/server/validation";

/** GET /api/evaluation/:setupId - the configuration, its groups and its relations. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ setupId: string }> },
) {
  const { setupId } = await params;
  return handleItem(request, () => getEvaluationSetup(setupId), "Evaluation setup");
}

/**
 * PATCH /api/evaluation/:setupId
 *
 * The weight blend is validated here and not only in the browser. A blend that
 * does not total 100 scales every score in the course, and unlike a bad name or
 * a wrong date there is nothing downstream that would notice.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ setupId: string }> },
) {
  const { setupId } = await params;

  const parsed = parseBody(evaluationSetupUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const updated = updateEvaluationSetup(setupId, parsed.data);
  if (!updated) return notFound("Evaluation setup");

  return NextResponse.json(updated);
}
