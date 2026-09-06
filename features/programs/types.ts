import type { ListQuery, ProgramTermStatus, SemesterCode } from "@/types";

export interface ProgramQueryParams extends ListQuery {
  status?: ProgramTermStatus;
  semester?: SemesterCode;
}
