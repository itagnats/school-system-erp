import { NextResponse } from "next/server";
import { studentUpdateSchema } from "@/lib/api/contracts";
import { handleItem, handleRemoval, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { deleteStudent, getStudent, updateStudent } from "@/server/services";

/** GET /api/students/:studentId - the full profile. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
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
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

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
 * Refused with 409 while any enrolment or invoice still points at the profile.
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
