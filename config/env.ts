import { z } from "zod";

/**
 * Central, validated environment access (scaffold.md §28).
 *
 * Two rules this file exists to enforce:
 *   - nothing reads process.env directly elsewhere, so a missing or malformed
 *     value fails loudly at startup instead of surfacing as a broken fetch;
 *   - only NEXT_PUBLIC_* values may appear here, because this module is
 *     imported by client components. A server-only secret added to this schema
 *     would be inlined into the browser bundle.
 */
const publicEnvSchema = z.object({
  /** Base path or origin the API layer prefixes onto every request. */
  NEXT_PUBLIC_API_URL: z.string().min(1).default("/api"),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  // Field names only. Never log the values themselves.
  const fields = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
  throw new Error(`Invalid public environment configuration: ${fields}`);
}

export const env = parsed.data;

export type PublicEnv = typeof env;
