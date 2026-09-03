import { env } from "@/config/env";
import { HttpError, messageForStatus } from "./errors";

/**
 * The single transport used by every feature service (scaffold.md §11).
 *
 *   Component -> Hook -> Service -> this client
 *
 * No component calls fetch directly, which keeps error handling, timeouts and
 * request shaping in one reviewable place.
 *
 * Security notes:
 *   - Requests are same-origin. `credentials: "same-origin"` means cookies are
 *     never attached to a cross-origin URL if the base ever becomes absolute.
 *   - Every request carries a timeout, so a hanging upstream cannot pin a tab
 *     open indefinitely.
 *   - Paths are encoded by the caller through `apiPath`; interpolating a raw
 *     user value into a URL is what allows path traversal into other records.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

export interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  /** JSON-serialisable request body. */
  body?: unknown;
  /** Query string values. Undefined and null entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

/** Error envelope the API is expected to use for a 4xx with field detail. */
interface ErrorEnvelope {
  message?: string;
  fieldErrors?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function readError(response: Response): Promise<HttpError> {
  const fallback = messageForStatus(response.status);

  // Only trust an error body that arrives as JSON in the agreed envelope.
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return new HttpError(fallback, response.status);
  }

  try {
    const envelope = (await response.json()) as ErrorEnvelope;
    const fieldErrors =
      envelope.fieldErrors && typeof envelope.fieldErrors === "object"
        ? envelope.fieldErrors
        : undefined;
    // Field errors are attached for form binding; the banner keeps the
    // vetted status message rather than an arbitrary server string.
    return new HttpError(fallback, response.status, fieldErrors);
  } catch {
    return new HttpError(fallback, response.status);
  }
}

async function request<T>(
  method: string,
  path: string,
  { body, query, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(path, query), {
      ...init,
      method,
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) throw await readError(response);
    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Build a path from segments, percent-encoding each one. Use this instead of
 * template strings so an id can never break out of its segment.
 */
export function apiPath(...segments: (string | number)[]): string {
  return segments.map((s) => encodeURIComponent(String(s))).join("/");
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>("POST", path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>("PUT", path, options),
  patch: <T>(path: string, options?: RequestOptions) =>
    request<T>("PATCH", path, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};
