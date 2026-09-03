"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { applyParams, readListQuery } from "@/lib/utils";
import type { SortDirection } from "@/types";

export interface ListQueryState {
  search: string;
  page: number;
  pageSize: number;
  sort?: string;
  direction: SortDirection;
}

/**
 * Table state stored in the URL (scaffold.md §26).
 *
 * The URL is the source of truth rather than component state, so a filtered
 * view can be refreshed, bookmarked and shared, and the browser back button
 * behaves the way a user expects.
 *
 * Two details that matter:
 *   - any change to search, filters or page size resets to page 1, because
 *     landing on page 7 of a two-page result set shows an empty table;
 *   - navigation uses replace and `scroll: false`, so typing in a search box
 *     does not fill the history stack or jump the page to the top.
 */
export function useListQueryParams(defaults?: Partial<ListQueryState>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<ListQueryState>(() => {
    const parsed = readListQuery(new URLSearchParams(searchParams.toString()));
    return {
      search: parsed.search ?? defaults?.search ?? "",
      page: parsed.page ?? defaults?.page ?? 1,
      pageSize: parsed.pageSize ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE,
      sort: parsed.sort ?? defaults?.sort,
      direction: parsed.direction ?? defaults?.direction ?? "asc",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const push = useCallback(
    (patch: Record<string, string | number | undefined | null>) => {
      const next = applyParams(new URLSearchParams(searchParams.toString()), patch);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSearch = useCallback(
    (search: string) => push({ search, page: undefined }),
    [push],
  );

  const setPage = useCallback((page: number) => push({ page }), [push]);

  const setPageSize = useCallback(
    (pageSize: number) => push({ pageSize, page: undefined }),
    [push],
  );

  const setSort = useCallback(
    (sort: string | undefined, direction: SortDirection = "asc") =>
      push({ sort, direction: sort ? direction : undefined, page: undefined }),
    [push],
  );

  /** Set an arbitrary filter param. Pass "all" or undefined to remove it. */
  const setFilter = useCallback(
    (key: string, value: string | number | undefined) =>
      push({ [key]: value, page: undefined }),
    [push],
  );

  /** Read an arbitrary filter param, falling back to the "all" sentinel. */
  const getFilter = useCallback(
    (key: string) => searchParams.get(key) ?? "all",
    [searchParams],
  );

  /** Drop every param, returning the list to its default view. */
  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /** How many params are set, for the FilterBar clear affordance. */
  const activeCount = useMemo(() => {
    let count = 0;
    searchParams.forEach((value, key) => {
      if (key === "page" || key === "pageSize") return;
      if (value && value !== "all") count += 1;
    });
    return count;
  }, [searchParams]);

  return {
    ...state,
    setSearch,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    getFilter,
    clearAll,
    activeCount,
  };
}
