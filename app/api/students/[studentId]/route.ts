import { handleItem } from "@/server/http";
import { getStudent } from "@/server/services";

/** GET /api/students/:studentId - the full profile. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  return handleItem(request, () => getStudent(studentId), "Student");
}
