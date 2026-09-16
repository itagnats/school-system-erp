import { NextResponse } from "next/server";
import { questionGroupUpdateSchema } from "@/lib/api/contracts";
import { jsonError, notFound } from "@/server/http";
import { parseBody, readJson } from "@/server/validation";
import { updateQuestionGroup } from "@/server/services";

/** PATCH /api/questions/groups/:groupId - rename it, or archive the group. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;

  const parsed = parseBody(questionGroupUpdateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const group = updateQuestionGroup(groupId, parsed.data);
  if (!group) return notFound("Question group");

  return NextResponse.json(group);
}
