import { NextResponse } from "next/server";
import { jsonError, notFound } from "@/server/http";
import { currentPrincipal, mayReadEvaluationResults } from "@/server/principal";
import { evaluationResults } from "@/server/services";
import { delayFor, readSimulate } from "@/server/simulate";

/**
 * GET /api/evaluation/:setupId/results
 *
 * Every assessee in a setup, scored. Not paginated: a course-semester is at
 * most a few dozen subjects, and the table is read as a whole - a page two
 * would hide the pass rate, which is the thing the screen is for.
 *
 * **Evaluators only** (added 2026-09-19). This is the Manage Evaluation
 * screen's data, and that screen is closed to students - but the endpoint was
 * not, because `proxy.ts` matches by prefix and `/api/evaluation` has to stay
 * readable for the queue and the form. Every signed-in student could pull the
 * whole table: thirteen peers with names, scores, grades and pass status
 * (`AUD-029`). A student reads one report, their own, through the route next
 * door.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ setupId: string }> },
) {
  const principal = await currentPrincipal();
  if (!principal) {
    return jsonError(401, "Sign in to continue", { status: "Sign in to continue" });
  }
  if (!mayReadEvaluationResults(principal)) {
    return jsonError(403, `Not available to a ${principal.role}`, {
      status: `Not available to a ${principal.role}`,
    });
  }

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
