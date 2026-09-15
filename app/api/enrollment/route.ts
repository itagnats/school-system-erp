import { NextResponse } from "next/server";
import { enrolRequestSchema } from "@/lib/api/contracts";
import { readFilter } from "@/server/query";
import { parseBody, readJson } from "@/server/validation";
import { handleList, jsonError } from "@/server/http";
import { enrolStudent, listEnrollments } from "@/server/services";

/** GET /api/enrollment - the joined roster view. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listEnrollments({
      ...query,
      programId: readFilter(params, "programId"),
      courseId: readFilter(params, "courseId"),
      semester: readFilter(params, "semester"),
      status: readFilter(params, "status"),
      evaluationGroupId: readFilter(params, "evaluationGroupId"),
    }),
  );
}

/**
 * POST /api/enrollment - enrol one student into one programme term.
 *
 * The body is a discriminated union on `source`, so the three paths in
 * direction.md §7 arrive as one request and a malformed combination - a new
 * student carrying someone else's id - cannot be expressed. Everything past
 * the shape check is a business rule, and the service picks the status it
 * deserves: 404 for a term or student that does not exist, 409 for a place
 * already held, 422 for a value the form can fix.
 */
export async function POST(request: Request) {
  const parsed = parseBody(enrolRequestSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = enrolStudent(parsed.data);
  if (!result.ok) {
    return jsonError(result.status, result.message, result.fieldErrors);
  }

  return NextResponse.json(result.data, { status: 201 });
}
