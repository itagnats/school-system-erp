import type { ListQuery, SemesterStatus } from "@/types";

export interface SemesterQueryParams extends ListQuery {
  status?: SemesterStatus;
  academicYear?: string;
}

/** The list row carries a derived enrollment count the domain type lacks. */
export interface SemesterListRow {
  id: string;
  code: string;
  name: string;
  academicYear: number;
  term: number;
  startDate: string;
  endDate: string;
  status: SemesterStatus;
  enrollmentCount: number;
}
