import { z } from "zod";
import { paginatedSchema } from "./list";

export const semesterSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  academicYear: z.number(),
  term: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["upcoming", "active", "closed"]),
  /** Derived by the service; not stored on the semester. */
  enrollmentCount: z.number().int().nonnegative(),
});

export const semesterListSchema = paginatedSchema(semesterSchema);

export type SemesterResponse = z.infer<typeof semesterSchema>;
