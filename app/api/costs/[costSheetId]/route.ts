import { handleItem } from "@/server/http";
import { getCostSheet } from "@/server/services";

/** GET /api/costs/:costSheetId - the sheet plus its full breakdown. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ costSheetId: string }> },
) {
  const { costSheetId } = await params;
  return handleItem(request, () => getCostSheet(costSheetId), "Cost sheet");
}
