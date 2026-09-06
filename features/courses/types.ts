import type { CourseStatus, ListQuery, SemesterCode } from "@/types";

/**
 * Query shapes local to the course screens. The domain type lives in
 * `types/course.ts`; what belongs here is how this feature asks for it.
 */
export interface CourseQueryParams extends ListQuery {
  status?: CourseStatus;
  semester?: SemesterCode;
}
