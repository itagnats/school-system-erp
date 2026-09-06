import { z } from "zod";

/**
 * Shared wire shapes.
 *
 * The client validates what comes back rather than trusting it. That is not
 * paranoia about our own server: it is the habit that makes the contract real,
 * and it turns a shape change into a caught error instead of a component
 * rendering `undefined`.
 */

export const sortDirectionSchema = z.enum(["asc", "desc"]);

/** `PaginatedResult<T>` for any item schema. */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

/** The error envelope `lib/api/client.ts` reads. */
export const errorEnvelopeSchema = z.object({
  message: z.string().optional(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
