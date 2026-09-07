import { NextResponse } from "next/server";
import { jsonError, notFound } from "@/server/http";
import { evaluationQueue } from "@/server/services";
import { delayFor, readSimulate } from "@/server/simulate";

/**
 * GET /api/evaluation/queue?as=<personaId>
 *
 * Everything one persona owes. Not under `/api/evaluation/[setupId]`, because a
 * queue spans setups and belongs to a person rather than to a configuration.
 *
 * `as` is optional: with no persona the first one is used, so the route works
 * before a reader has chosen an identity.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const simulate = readSimulate(params);
  await delayFor(simulate);

  if (simulate === "error") {
    return jsonError(500, "Simulated failure, requested by _simulate=error");
  }

  const personaId = params.get("as") ?? undefined;
  const queue = evaluationQueue(personaId);
  if (!queue) return notFound("Persona");

  if (simulate === "empty") {
    return NextResponse.json({ ...queue, assignments: [] });
  }

  return NextResponse.json(queue);
}
