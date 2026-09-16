import { NextResponse } from "next/server";
import { questionUpdateSchema } from "@/lib/api/contracts";
import { jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { deleteQuestion, isQuestionInUse, updateQuestion } from "@/server/services";

/** PATCH /api/questions/:questionId - reword it, retype it, or archive it. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const { questionId } = await params;

  const parsed = parseBody(questionUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const group = updateQuestion(questionId, parsed.data);
  if (!group) return notFound("Question");

  return NextResponse.json(group);
}

/**
 * DELETE /api/questions/:questionId
 *
 * **409 once a setup has copied it** (direction.md §18a), the same answer the
 * cost catalogue gives. The copies would survive the delete; their provenance
 * would not, and "what was this person actually asked" is the question the bank
 * exists to answer. Archive it instead - an archived question stays out of new
 * setups and leaves the answered ones intact.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const { questionId } = await params;

  const result = deleteQuestion(questionId);
  if (!result) return notFound("Question");
  if (isQuestionInUse(result)) {
    return jsonError(
      409,
      `${result.blockedBy} evaluation${result.blockedBy === 1 ? " has" : "s have"} copied this question. Archive it instead.`,
    );
  }

  return NextResponse.json(result);
}
