import { NextResponse } from "next/server";
import { programCreateSchema } from "@/lib/api/contracts";
import { readFilter } from "@/server/query";
import { handleList, jsonError } from "@/server/http";
import { createProgram, listPrograms } from "@/server/services";
import { parseBody, readJson } from "@/server/validation";

/**
 * GET /api/programs - one row per program (revised 2026-09-21).
 *
 * It returned program *terms* until this date, which made BSC-IT four
 * unrelated rows. Terms are their own resource now, at `/api/program-terms`,
 * and they carry their own access rule - the allowlist falls closed, so a new
 * prefix without one is denied to everybody.
 */
export async function GET(request: Request) {
  return handleList(request, (query, params) =>
    listPrograms({ ...query, status: readFilter(params, "status") }),
  );
}

/**
 * POST /api/programs - a program and its first term, in one write.
 *
 * **The term is not optional**, and that is `AUD-036` in the shape of an
 * endpoint. Nothing written reaches the store, so a program created alone
 * could be listed from the client cache and never opened - every detail page
 * is a server component reading a store that took no write. Creating the
 * program, its first term and that term's empty cost sheet together means the
 * client holds the whole graph and nothing has to be navigated into.
 *
 * The response is therefore larger than a created record usually is, and
 * deliberately so: it is the only copy that will ever exist.
 */
export async function POST(request: Request) {
  const parsed = parseBody(programCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const result = createProgram(parsed.data);
  if (!result.ok) {
    return jsonError(422, "Some fields need attention", result.fieldErrors);
  }

  return NextResponse.json(result.data, { status: 201 });
}
