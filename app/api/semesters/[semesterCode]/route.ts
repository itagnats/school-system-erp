import { NextResponse } from "next/server";
import { semesterUpdateSchema } from "@/lib/api/contracts";
import { handleItem, jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { getSemester, updateSemester } from "@/server/services";

/** GET /api/semesters/:semesterCode */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ semesterCode: string }> },
) {
  const { semesterCode } = await params;
  return handleItem(request, () => getSemester(semesterCode), "Semester");
}

/**
 * PATCH /api/semesters/:semesterCode (direction.md 1, added 2026-09-20)
 *
 * A semester keeps its code. Sending an academic year or a term that would
 * produce a different one is refused with a field error rather than applied,
 * because renumbering in place would leave every enrollment, cost sheet,
 * program term and invoice joined to a code that no longer names this record.
 *
 * There is no DELETE. A semester with a single enrollment, cost sheet or
 * program term against it cannot go, and the seeded ones all have all three -
 * so the route would exist to refuse every request it ever received. `closed`
 * is the status that means a semester is over.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ semesterCode: string }> },
) {
  const { semesterCode } = await params;

  const parsed = parseBody(semesterUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = updateSemester(semesterCode, parsed.data);
  if (!result) return notFound("Semester");
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data);
}
