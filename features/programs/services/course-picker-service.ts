import { api } from "@/lib/api";
import { courseListSchema } from "@/lib/api/contracts";
import type { Course } from "@/types";

/**
 * The courses a curriculum may draw on.
 *
 * A deliberate second copy of the read half of
 * `features/courses/services/course-service.ts`, for the reason `AUD-012`
 * settled on 2026-09-20: no feature in this application imports another, and
 * the alternatives were a new rung in the layering chain for one `GET` or a
 * carve-out that turns a one-line grep into something only memory enforces.
 *
 * The duplication is source-level only. Both copies call the same endpoint,
 * parse with the same `courseListSchema`, and are held under the same
 * `queryKeys.courses` entry, so they cannot return different data.
 *
 * **Writes are not duplicated.** A course is maintained on its own screen; a
 * curriculum only ever names one.
 */

/**
 * Every active course, whatever semester it has run in.
 *
 * It was filtered to the term's semester until 2026-09-21, which made a newly
 * created semester a dead end: no course is offered in it and no screen
 * writes `offeredIn`. **Putting a course in a curriculum is the act of
 * scheduling it** (`AUD-035`), so the picker offers all of them and the
 * server no longer refuses one the semester has not run before.
 *
 * `pageSize` is the maximum the list query allows and the catalog holds 30
 * courses, so this is one page rather than a paginated picker. If the catalog
 * outgrows that, this needs a search box before it needs a second page.
 */
export async function fetchActiveCourses(): Promise<Course[]> {
  const raw = await api.get<unknown>("courses", {
    query: { status: "active", pageSize: 100, sort: "code" },
  });
  return courseListSchema.parse(raw).items as Course[];
}
