import { handleItem } from "@/server/http";
import { getCourse } from "@/server/services";

/** GET /api/courses/:courseId - accepts either the id or the course code. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  return handleItem(request, () => getCourse(courseId), "Course");
}
