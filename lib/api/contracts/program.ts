import { z } from "zod";
import { paginatedSchema } from "./list";

/**
 * A programme term reaches a table as its money figures, not its curriculum.
 *
 * The course list, the roster and the per-course cost attribution are on the
 * detail endpoint: a table needs to answer "did this make money", and shipping
 * the whole curriculum per row so the browser could count it would move the
 * join back into the client.
 */
export const programTermSummarySchema = z.object({
  id: z.string(),
  programId: z.string(),
  programCode: z.string(),
  programName: z.string(),
  semesterCode: z.string(),
  status: z.enum(["planning", "open", "closed"]),
  courseCount: z.number().int().nonnegative(),
  enrolledCount: z.number().int().nonnegative(),
  currency: z.string(),
  packagePrice: z.number(),
  /** Package price x head count — what the price implies (direction.md §13a). */
  listRevenue: z.number(),
  /** What the invoices say. Lower than listRevenue by the credits given. */
  revenue: z.number(),
  collected: z.number(),
  outstanding: z.number(),
  totalCost: z.number(),
  netProfit: z.number(),
  marginPercent: z.number().nullable(),
  coursesMissingCostSheet: z.number().int().nonnegative(),
});

export const programTermListSchema = paginatedSchema(programTermSummarySchema);

export type ProgramTermSummaryResponse = z.infer<typeof programTermSummarySchema>;

/** Only the price is editable from the term screen; the rest is curriculum. */
export const programTermUpdateSchema = z.object({
  packagePrice: z
    .number({ message: "The package price must be a number" })
    .min(0, "A package price cannot be negative")
    .max(1_000_000, "That is larger than any package in this demo")
    .optional(),
  status: z.enum(["planning", "open", "closed"]).optional(),
});

export type ProgramTermUpdateInput = z.infer<typeof programTermUpdateSchema>;
