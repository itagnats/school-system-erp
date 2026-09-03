/**
 * Cross-domain primitives. Anything that belongs to a single domain lives in
 * that domain file instead (see scaffold.md §10).
 */

/** Semester code in the PRIME format, e.g. `202602`. See types/semester.ts. */
export type SemesterCode = string;

/** Visual weight a status maps to. Features map their own status unions onto
 *  these tones so that generic components carry no business knowledge. */
export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "accent";

/** A value a user picks from a list. Used by Select, FilterBar and friends. */
export interface Option<TValue extends string = string> {
  value: TValue;
  label: string;
  description?: string;
  disabled?: boolean;
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: string;
  direction: SortDirection;
}

export interface PaginationState {
  /** 1-based, because it is mirrored into the URL where users can read it. */
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Shape every list query accepts. Kept flat so it can round-trip through URL
 * search params without a serializer (scaffold.md §26).
 */
export interface ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: SortDirection;
}

/** The four states every data-driven surface must handle (scaffold.md §20). */
export type LoadState = "loading" | "success" | "empty" | "error";

export interface ApiError {
  message: string;
  /** HTTP status when the failure came from a response. */
  status?: number;
  /** Field-level messages, keyed by form field name. */
  fieldErrors?: Record<string, string>;
}
