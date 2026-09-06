import type { ListQuery } from "@/types";

export interface StudentQueryParams extends ListQuery {
  program?: string;
  yearLevel?: string;
}
