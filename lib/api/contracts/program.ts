import { z } from "zod";
import { paginatedSchema } from "./list";

/**
 * A program term as the academic record: what it gathers, and what it charges.
 *
 * The course list, the roster and the per-course attribution are on the detail
 * endpoint — shipping the whole curriculum per row so the browser could count
 * it would move the join back into the client.
 *
 * **The P&L is deliberately absent** (§13a, revised 2026-09-20). This shape is
 * read by the Curriculum list and the Enrollment list, neither of which is a
 * money screen; profitability is served by the program cost endpoint instead.
 * Not sending a figure is the only reliable way to keep it off a screen.
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
  /** What the package charges. The only money a curriculum row carries. */
  packagePrice: z.number(),
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
