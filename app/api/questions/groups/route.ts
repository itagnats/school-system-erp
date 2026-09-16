import { NextResponse } from "next/server";
import { questionGroupCreateSchema } from "@/lib/api/contracts";
import { jsonError } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { createQuestionGroup } from "@/server/services";

/**
 * POST /api/questions/groups - a new question group.
 *
 * A static segment beside `[questionId]`, which Next resolves first, so a group
 * can never be mistaken for a question id.
 */
export async function POST(request: Request) {
  const parsed = parseBody(questionGroupCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  return NextResponse.json(createQuestionGroup(parsed.data), { status: 201 });
}
