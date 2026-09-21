import { handleItem } from "@/server/http";
import { getProgramDetail } from "@/server/services";

/**
 * GET /api/programs/:programId - one program and every term under it.
 *
 * Added 2026-09-21 with the program level itself. The terms come back as the
 * same `ProgramTermSummary` the term list uses, built through the same
 * `buildSummaries`, so a program's own page and the term list cannot show
 * different numbers for the same term.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  return handleItem(request, () => getProgramDetail(programId), "Program");
}
