import type {
  ListQuery,
  ProgramStatus,
  ProgramTermStatus,
  SemesterCode,
} from "@/types";

/**
 * One shape for both lists.
 *
 * `status` is widened to cover a program's statuses as well as a term's since
 * 2026-09-21. The two lists filter on different unions and the server reads
 * the value as a string either way, so splitting this in two would be two
 * interfaces that differ by one field.
 */
export interface ProgramQueryParams extends ListQuery {
  status?: ProgramTermStatus | ProgramStatus;
  semester?: SemesterCode;
}
