import type { ListQuery } from "@/types";

/**
 * URL search params are the storage for table state: search, filters, sorting
 * and pagination all live there so a view can be refreshed and shared
 * (scaffold.md §26). These helpers keep that serialisation in one place.
 */

/** Read a string param, treating an empty string as absent. */
export function readParam(
  params: URLSearchParams,
  key: string,
): string | undefined {
  const value = params.get(key);
  return value && value.length > 0 ? value : undefined;
}

/** Read a positive integer param, ignoring anything that is not one. */
export function readIntParam(
  params: URLSearchParams,
  key: string,
): number | undefined {
  const raw = readParam(params, key);
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Apply a patch to search params, dropping keys whose value is undefined,
 * empty or the literal "all" so filter defaults never clutter the URL.
 */
export function applyParams(
  current: URLSearchParams,
  patch: Record<string, string | number | undefined | null>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  return next;
}

/** Standard list-query decoding shared by every table page. */
export function readListQuery(params: URLSearchParams): ListQuery {
  const direction = readParam(params, "direction");
  return {
    search: readParam(params, "search"),
    page: readIntParam(params, "page"),
    pageSize: readIntParam(params, "pageSize"),
    sort: readParam(params, "sort"),
    direction: direction === "asc" || direction === "desc" ? direction : undefined,
  };
}
