import { NextResponse } from "next/server";
import { studentUpdateSchema } from "@/lib/api/contracts";
import { handleItem, handleRemoval, jsonError, notFound } from "@/server/http";
import { currentPrincipal, mayReadStudent, mayWriteStudent } from "@/server/principal";
import { parseBody, readJson } from "@/server/validation";
import { deleteStudent, getStudent, updateStudent } from "@/server/services";

/**
 * The owner half of an owner-scoped rule (direction.md §3a).
 *
 * `/api/students` is marked `owner: ["student"]`, which gets a student past
 * `proxy.ts` to *a* profile and settles nothing about whose. These two handlers
 * are where it is settled, and they are the reason the marking is safe: the
 * proxy refuses a role, and only code that can see the record can refuse a
 * person.
 *
 * Returns the refusal, or nothing when the caller may proceed. `fieldErrors`
 * carries the reason because the client keeps its own prose for `message` and
 * reads only that key.
 */
async function refuseUnlessAllowed(
  studentId: string,
  intent: "read" | "write",
): Promise<Response | undefined> {
  const principal = await currentPrincipal();
  if (!principal) return jsonError(401, "Sign in to continue", { status: "Sign in to continue" });

  const allowed =
    intent === "read"
      ? mayReadStudent(principal, studentId)
      : mayWriteStudent(principal, studentId);

  if (allowed) return undefined;
  return jsonError(403, "That profile is not yours", {
    status: "That profile is not yours",
  });
}

/** GET /api/students/:studentId - the full profile. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const refused = await refuseUnlessAllowed(studentId, "read");
  if (refused) return refused;

  return handleItem(request, () => getStudent(studentId), "Student");
}

/**
 * PATCH /api/students/:studentId - one profile section (direction.md §10).
 *
 * The body is a discriminated union on `section`, so a request carries one
 * complete section and the server never has to decide whether a missing field
 * means unchanged or cleared. A 422 comes back with `fieldErrors` keyed by the
 * form's own field name, which is what puts each message under the input that
 * caused it.
 *
 * A student may send this for **their own** profile, every section of it - the
 * user's decision on 2026-09-16, taken knowing it lets them rewrite their own
 * program and year level, which no real school permits. It is recorded in
 * direction.md §3a as a divergence rather than left to be discovered here.
 * Deletion is not part of it: `ownerMethods` stops at `PATCH`, so a student's
 * `DELETE` never reaches this file.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  const refused = await refuseUnlessAllowed(studentId, "write");
  if (refused) return refused;

  const parsed = parseBody(studentUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = updateStudent(studentId, parsed.data);
  if (!result) return notFound("Student");
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/students/:studentId
 *
 * Refused with 409 while any enrollment or invoice still points at the profile.
 * The reason travels in `fieldErrors.status`, because the client keeps its own
 * vetted prose for the banner and reads only that key out of the body - a 409
 * whose explanation sits in `message` shows the user nothing.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  return handleRemoval(deleteStudent(studentId), "Student");
}
