import { z } from "zod";

/**
 * The demo sign-in request (direction.md §3a).
 *
 * One field, and it is an id from a list the server itself published - there is
 * no password, because there is nothing to protect. Validated all the same: the
 * account id reaches a lookup and then a cookie, and "it can only be one of
 * four values" is a statement about the UI, not about what arrives.
 *
 * The allowlist is deliberately narrower than the id format needs to be. A
 * value that reaches a cookie should not be able to carry a separator, a quote
 * or a path segment, whatever the lookup would have done with it.
 */
export const signInSchema = z.object({
  accountId: z
    .string()
    .trim()
    .min(1, "Choose who to sign in as")
    .max(64)
    .regex(/^[a-z0-9-]+$/i, "That is not a demo account"),
});

export type SignInInput = z.infer<typeof signInSchema>;
