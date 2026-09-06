import "server-only";

import type { ZodType } from "zod";

/**
 * Request-body validation for the route handlers.
 *
 * The whole point of this file is the shape of a failure. `lib/api/client.ts`
 * keeps its own vetted status message and reads only `fieldErrors` out of the
 * body, so a validation error is only useful to a user if it is attributed to
 * the field it came from. A 422 with a prose message and no `fieldErrors` shows
 * the user "Some fields need attention" and nothing else.
 */

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string> };

/**
 * Flattens a Zod issue list into one message per field.
 *
 * First issue wins: a field with three problems shows the first, because a form
 * control has room for one line and the user fixes them one at a time anyway.
 * Nested paths join with a dot so `groups.0.name` still points somewhere.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

/** Reads a JSON body, treating a malformed one as a request problem, not a crash. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
