import "server-only";

import { NextResponse } from "next/server";
import { emptyResult, readListQuery, type ListQueryInput } from "./query";
import { delayFor, readSimulate } from "./simulate";
import type { PaginatedResult } from "@/types";

/**
 * The plumbing every route handler shares.
 *
 * A handler should read as: parse the request, call a service, shape the
 * response. Anything longer than that is usually business logic that belongs in
 * a service instead.
 */

/** The error envelope `lib/api/client.ts` expects. */
export function jsonError(
  status: number,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  // The client deliberately discards this message for display and keeps its own
  // vetted one, so the useful detail belongs in fieldErrors. The message is
  // here for anyone reading the network tab.
  return NextResponse.json({ message, fieldErrors }, { status });
}

export function notFound(what: string) {
  return jsonError(404, `${what} not found`);
}

/**
 * Runs a list endpoint: shared query parsing, the demo switch, and the
 * artificial latency that makes a skeleton visible.
 */
export async function handleList<T>(
  request: Request,
  run: (query: ListQueryInput, params: URLSearchParams) => PaginatedResult<T>,
) {
  const params = new URL(request.url).searchParams;
  const simulate = readSimulate(params);
  await delayFor(simulate);

  if (simulate === "error") {
    return jsonError(500, "Simulated failure, requested by _simulate=error");
  }

  const query = readListQuery(params);
  if (simulate === "empty") {
    return NextResponse.json(emptyResult<T>(query.page, query.pageSize));
  }

  return NextResponse.json(run(query, params));
}

/** Runs a single-record endpoint, with the same demo switch and latency. */
export async function handleItem<T>(
  request: Request,
  run: () => T | undefined,
  label: string,
) {
  const params = new URL(request.url).searchParams;
  const simulate = readSimulate(params);
  await delayFor(simulate);

  if (simulate === "error") {
    return jsonError(500, "Simulated failure, requested by _simulate=error");
  }

  const result = simulate === "empty" ? undefined : run();
  if (!result) return notFound(label);

  return NextResponse.json(result);
}
