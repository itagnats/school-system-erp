import { NextResponse } from "next/server";
import { jsonError, notFound } from "@/server/http";
import { evaluationResults } from "@/server/services";
import { delayFor, readSimulate } from "@/server/simulate";

/**
 * GET /api/evaluation/:setupId/results
 *
 * Every assessee in a setup, scored. Not paginated: a course-semester is at
 * most a few dozen subjects, and the table is read as a whole - a page two
 * would hide the pass rate, which is the thing the screen is for.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ setupId: string }> },
) {
  const search = new URL(request.url).searchParams;
  const simulate = readSimulate(search);
  await delayFor(simulate);

  if (simulate === "error") {
    return jsonError(500, "Simulated failure, requested by _simulate=error");
  }

  const { setupId } = await params;
  const results = evaluationResults(setupId);
  if (!results) return notFound("Evaluation setup");

  if (simulate === "empty") return NextResponse.json({ ...results, rows: [] });

  return NextResponse.json(results);
}
