import { NextResponse } from "next/server";
import { courseUpdateSchema } from "@/lib/api/contracts";
import { handleItem, handleRemoval, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { deleteCourse, getCourse, updateCourse } from "@/server/services";

/** GET /api/courses/:courseId - accepts either the id or the course code. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  return handleItem(request, () => getCourse(courseId), "Course");
}

/** PATCH /api/courses/:courseId */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  const parsed = parseBody(courseUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = updateCourse(courseId, parsed.data);
  if (!result) return notFound("Course");
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/courses/:courseId
 *
 * Refused while a curriculum lists it, anyone is enrolled, or a cost sheet
 * records what it cost. `archived` is the intended route for a course no longer
 * taught, and the 409 says so.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  return handleRemoval(deleteCourse(courseId), "Course");
}
