import { NextResponse } from "next/server";
import { questionCreateSchema } from "@/lib/api/contracts";
import { jsonError } from "@/server/http";
import { readFilter } from "@/server/query";
import { delayFor, readSimulate } from "@/server/simulate";
import { parseBody, readJson } from "@/server/validation";
import { createQuestion, listQuestionGroups } from "@/server/services";

/**
 * GET /api/questions - the whole bank, as a tree (direction.md §18a).
 *
 * Not `handleList`: that helper speaks the shared paginated contract, and this
 * endpoint deliberately does not paginate - a page boundary inside a group
 * would split the thing being maintained. The demo switch and the artificial
 * latency are still honored, because the screen has the same four states as
 * any other.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const simulate = readSimulate(params);
  await delayFor(simulate);

  if (simulate === "error") {
    return jsonError(500, "Simulated failure, requested by _simulate=error");
  }
  if (simulate === "empty") {
    return NextResponse.json({ groups: [] });
  }

  return NextResponse.json({
    groups: listQuestionGroups({
      search: (params.get("search") ?? "").trim(),
      status: readFilter(params, "status"),
      type: readFilter(params, "type"),
      role: readFilter(params, "role"),
    }),
  });
}

/**
 * POST /api/questions - a new question in a group.
 *
 * The rule worth having here rather than only on the form: a rating question
 * with no criterion feeds nothing, and a text question carrying one would enter
 * a score it is not meant to be part of. Neither fails downstream - the first
 * is silently unscored and the second silently scored.
 */
export async function POST(request: Request) {
  const parsed = parseBody(questionCreateSchema, await readJson(request));
  if (!parsed.ok) {
    return jsonError(422, "Some fields need attention", parsed.fieldErrors);
  }

  const group = createQuestion(parsed.data);
  if (!group) {
    return jsonError(422, "Some fields need attention", {
      groupId: "That question group does not exist.",
    });
  }

  return NextResponse.json(group, { status: 201 });
}
