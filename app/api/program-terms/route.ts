import { NextResponse } from "next/server";
import { programTermCreateSchema } from "@/lib/api/contracts";
import { readFilter } from "@/server/query";
import { handleList, jsonError, notFound } from "@/server/http";
import { createProgramTerm, listProgramTerms } from "@/server/services";
import { parseBody, readJson } from "@/server/validation";

/**
 * Program terms (moved here 2026-09-21).
 *
 * They lived under `/api/programs` while that endpoint returned terms. Once
 * programs became a resource of their own the two could not share a path, and
 * a term is genuinely a different thing from a program - it is what a student
 * enrolls in and what carries a price (direction.md §4a).
 */

/** GET /api/program-terms - one row per term, filtered by status or semester. */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listProgramTerms({
      ...query,
      status: readFilter(params, "status"),
      semester: readFilter(params, "semester"),
    }),
  );
}

/**
 * POST /api/program-terms - add a term to a program that already exists.
 *
 * The program has to be in the store, which is why this works for the five
 * seeded programs and not for one created a moment ago (`AUD-036`). A program
 * and its first term are created together by `POST /api/programs` instead.
 *
 * A 404 here means the program id names nothing; a 422 means the term itself
 * is wrong - an unknown semester, a semester this program already has a term
 * in, or a course that is missing or archived.
 */
export async function POST(request: Request) {
  const parsed = parseBody(programTermCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = createProgramTerm(parsed.data);
  if (!result) return notFound("Program");
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data, { status: 201 });
}
