import { NextResponse } from "next/server";
import { semesterCreateSchema } from "@/lib/api/contracts";
import { readFilter } from "@/server/query";
import { parseBody, readJson } from "@/server/validation";
import { handleList, jsonError } from "@/server/http";
import { createSemester, listSemesters } from "@/server/services";

/** GET /api/semesters */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listSemesters({
      ...query,
      status: readFilter(params, "status"),
      academicYear: readFilter(params, "academicYear"),
    }),
  );
}

/**
 * POST /api/semesters (direction.md 1, added 2026-09-20)
 *
 * Validation failure comes back as 422 with `fieldErrors` keyed by form field,
 * so React Hook Form can put each message under the input that caused it.
 *
 * The code is not in the request. It is derived from the academic year and the
 * term, because a typed code is a third field that can disagree with the two
 * it is built from - and the code is what every enrollment, cost sheet,
 * program term and invoice joins on.
 */
export async function POST(request: Request) {
  const parsed = parseBody(semesterCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = createSemester(parsed.data);
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data, { status: 201 });
}
