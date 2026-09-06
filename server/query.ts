import "server-only";

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/config/app";
import type { PaginatedResult, SortDirection } from "@/types";

/**
 * Shared list mechanics: parse, filter, sort, paginate.
 *
 * Every list endpoint speaks the same query, so this lives once rather than
 * five times. Sorting and paging happen here, on the server: a client that
 * fetches everything and slices it in the browser demonstrates nothing.
 */

export interface ListQueryInput {
  search: string;
  page: number;
  pageSize: number;
  sort?: string;
  direction: SortDirection;
}

const MAX_PAGE_SIZE = Math.max(...PAGE_SIZE_OPTIONS);

function toInt(raw: string | null, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Reads the list query out of the URL.
 *
 * Values are clamped rather than rejected: a hand-edited `?page=-4` should show
 * page one, not a 400. Only genuinely malformed input is worth an error, and a
 * number outside its range is not malformed.
 */
export function readListQuery(params: URLSearchParams): ListQueryInput {
  const page = Math.max(1, toInt(params.get("page"), 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, toInt(params.get("pageSize"), DEFAULT_PAGE_SIZE)),
  );
  const direction: SortDirection = params.get("direction") === "desc" ? "desc" : "asc";
  return {
    search: (params.get("search") ?? "").trim(),
    page,
    pageSize,
    sort: params.get("sort") ?? undefined,
    direction,
  };
}

/** Reads a filter that uses the `all` sentinel, returning undefined for it. */
export function readFilter(params: URLSearchParams, key: string): string | undefined {
  const raw = params.get(key);
  return !raw || raw === "all" ? undefined : raw;
}

/** Case-insensitive containment across the given fields. */
export function matchesSearch(search: string, ...fields: (string | undefined)[]): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/**
 * Sorts by a named accessor map.
 *
 * The map is what keeps `?sort=` from being an arbitrary property path into the
 * row: an unknown key falls back to the default rather than reaching into the
 * object, so the query string cannot be used to probe the shape of the store.
 */
export function sortRows<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number>,
  sort: string | undefined,
  direction: SortDirection,
  fallback: string,
): T[] {
  const accessor = accessors[sort ?? ""] ?? accessors[fallback];
  if (!accessor) return rows;

  const factor = direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * factor;
    }
    return String(left).localeCompare(String(right)) * factor;
  });
}

export function paginate<T>(rows: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = rows.length;
  // A filter that shrinks the result set can leave the URL pointing past the
  // end. Clamping here means the last page is shown instead of a blank table.
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const start = (safePage - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
  };
}

/** The shape returned when `?_simulate=empty` is set. */
export function emptyResult<T>(page: number, pageSize: number): PaginatedResult<T> {
  return { items: [], total: 0, page, pageSize };
}
