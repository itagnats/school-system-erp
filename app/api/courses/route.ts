import { NextResponse } from "next/server";
import { courseCreateSchema } from "@/lib/api/contracts";
import { readFilter } from "@/server/query";
import { parseBody, readJson } from "@/server/validation";
import { handleList, jsonError } from "@/server/http";
import { createCourse, listCourses } from "@/server/services";

/** GET /api/courses - paginated, filtered, sorted server-side. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listCourses({
      ...query,
      status: readFilter(params, "status"),
      semester: readFilter(params, "semester"),
    }),
  );
}

/**
 * POST /api/courses
 *
 * Validation failure comes back as 422 with `fieldErrors` keyed by form field,
 * which is what lets React Hook Form put each message under the input that
 * caused it. The client discards any prose message we send, by design.
 */
export async function POST(request: Request) {
  const parsed = parseBody(courseCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = createCourse(parsed.data);
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data, { status: 201 });
}
