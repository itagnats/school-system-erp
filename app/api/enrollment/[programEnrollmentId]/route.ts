import { NextResponse } from "next/server";
import { jsonError, notFound } from "@/server/http";
import { withdrawFromTerm } from "@/server/services";

interface RouteParams {
  params: Promise<{ programEnrollmentId: string }>;
}

/**
 * DELETE /api/enrollment/:programEnrollmentId - withdraw, not remove
 * (direction.md §8).
 *
 * The verb is DELETE because that is what the caller means: take this student
 * off the term. What happens is a status change, because `withdrawn` is the end
 * of the lifecycle §8 describes and the record is what an invoice, a closed
 * term's head count and an evaluation group all still refer to.
 *
 * The response says so rather than returning 204: it carries the new membership
 * and how many course enrollments were cancelled with it, so the screen can
 * state the consequence instead of implying a row vanished.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { programEnrollmentId } = await params;

  const result = withdrawFromTerm(programEnrollmentId);
  if (!result) return notFound("Program enrollment");

  // Withdrawing twice is not an error: the second call reports the same
  // membership with nothing left to cancel, which is the truth.
  return NextResponse.json(result);
}

/** A malformed verb on a real id is worth a clear answer. */
export async function GET() {
  return jsonError(405, "Read the roster through /api/enrollment");
}
