import type { z } from "zod";
import { semesterCreateSchema } from "@/lib/api/contracts";
import type { SemesterCreateInput } from "@/lib/api/contracts";
import type { SemesterListRow } from "../types";

/**
 * Form validation for the semester dialog.
 *
 * The schema is the wire contract, re-exported rather than restated, for the
 * reason `course-schema.ts` gives: a second copy drifts from the one the route
 * handler validates against, and the failure mode of that drift is a form that
 * accepts input the server rejects.
 *
 * What belongs here is the form-shaped part — defaults, and the mapping from an
 * existing record back into a form.
 */
export { semesterCreateSchema, semesterUpdateSchema } from "@/lib/api/contracts";

export type SemesterFormValues = z.input<typeof semesterCreateSchema>;
export type { SemesterCreateInput, SemesterUpdateInput } from "@/lib/api/contracts";

/**
 * A new semester starts as `upcoming` and carries no dates.
 *
 * The year is left to the caller, which passes the latest year already in the
 * data. A hardcoded year would be wrong the moment the seed moves, and a
 * `new Date().getFullYear()` would be non-deterministic on a screen that server
 * renders.
 */
export function emptySemesterForm(academicYear: number): SemesterCreateInput {
  return {
    name: "",
    academicYear,
    term: 1,
    startDate: "",
    endDate: "",
    status: "upcoming",
  };
}

export function semesterToForm(semester: SemesterListRow): SemesterCreateInput {
  return {
    name: semester.name,
    academicYear: semester.academicYear,
    term: semester.term,
    startDate: semester.startDate,
    endDate: semester.endDate,
    status: semester.status,
  };
}

/**
 * The code a year and a term imply, shown on the form as it is typed.
 *
 * A second implementation of `semesterCodeFor` in the semester service, and
 * deliberately so: the server's copy is the one that decides, this one only
 * tells the user what they are about to create. The alternative is importing
 * from `server/`, which is `import "server-only"` and would break the build the
 * moment this client component loaded it.
 */
export function previewSemesterCode(academicYear: number, term: number): string {
  if (!Number.isInteger(academicYear) || !Number.isInteger(term)) return "";
  if (term < 1 || term > 99) return "";
  return `${academicYear}${String(term).padStart(2, "0")}`;
}
