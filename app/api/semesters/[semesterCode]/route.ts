import { handleItem } from "@/server/http";
import { getSemester } from "@/server/services";

/** GET /api/semesters/:semesterCode */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ semesterCode: string }> },
) {
  const { semesterCode } = await params;
  return handleItem(request, () => getSemester(semesterCode), "Semester");
}
