import type { SemesterCode } from "./common";

/** direction.md §4 keeps the course model deliberately small. */
export type CourseStatus = "draft" | "active" | "archived";

export interface Course {
  id: string;
  /** Human-facing code, e.g. `IT101`. Unique. */
  code: string;
  name: string;
  description: string;
  credits: number;
  status: CourseStatus;
  /** Semesters this course has been offered in. A course may run many times. */
  offeredIn: SemesterCode[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseListFilters {
  search?: string;
  status?: CourseStatus | "all";
  semester?: SemesterCode | "all";
}
