import { z } from "zod";
import { paginatedSchema } from "./list";

/**
 * A cost sheet reaches a table as its derived totals, not as its nested groups.
 * The full breakdown, with every intermediate figure the UI shows, is on the
 * detail endpoint.
 */
export const costSheetListItemSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  semesterCode: z.string(),
  status: z.enum(["draft", "review", "approved"]),
  currency: z.string(),
  studentCount: z.number().int().nonnegative(),
  directTotal: z.number(),
  indirectShare: z.number(),
  totalCost: z.number(),
  costPerStudent: z.number().nullable(),
  programTermId: z.string().nullable(),
  updatedAt: z.string(),
});

export const costSheetListSchema = paginatedSchema(costSheetListItemSchema);

export type CostSheetListResponse = z.infer<typeof costSheetListSchema>;

/**
 * A program cost sheet as a table row (direction.md §11, revised 2026-09-16).
 *
 * Carries the package price beside the cost, because the comparison is the
 * reason the list exists: a program costing is only interesting against what
 * the program charges.
 */
export const programCostListItemSchema = z.object({
  id: z.string(),
  programTermId: z.string(),
  programId: z.string(),
  programCode: z.string(),
  programName: z.string(),
  semesterCode: z.string(),
  status: z.enum(["draft", "review", "approved"]),
  currency: z.string(),
  courseCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
  directTotal: z.number(),
  indirectTotal: z.number(),
  totalCost: z.number(),
  costPerStudent: z.number().nullable(),
  preferredPrice: z.number().nullable(),
  packagePrice: z.number(),
  missingCostSheets: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const programCostListSchema = paginatedSchema(programCostListItemSchema);

export type ProgramCostListResponse = z.infer<typeof programCostListSchema>;

/**
 * What a client may change on a COURSE cost sheet.
 *
 * Head count and status only. Markup and the rounding step moved to the
 * program term on 2026-09-15 (§13) — a package is priced once, and several
 * per-course markups would leave a program total that no screen adds up.
 * `allocationPercent` is gone entirely: a share of the indirect pool is derived
 * from the driver, never entered.
 */
export const costSheetUpdateSchema = z.object({
  studentCount: z
    .number({ message: "Student count must be a number" })
    .int("A head count is a whole number")
    .min(0, "A head count cannot be negative")
    .max(500, "That is larger than any cohort in this demo")
    .optional(),
  status: z.enum(["draft", "review", "approved"]).optional(),
});

export type CostSheetUpdateInput = z.infer<typeof costSheetUpdateSchema>;

/**
 * What a client may change on a PROGRAM cost sheet.
 *
 * The driver is accepted even though the union has one member: refusing a field
 * the type allows would be a lie about what the endpoint supports, and the day
 * a second driver lands the schema should not be the thing that has to change.
 */
export const programCostSheetUpdateSchema = z.object({
  markupPercent: z
    .number({ message: "Markup must be a number" })
    .min(0, "Markup cannot be negative")
    .max(100, "A markup over 100 percent is almost certainly a typo")
    .optional(),
  priceRoundingStep: z
    .number({ message: "Rounding step must be a number" })
    .int("Round to a whole number of baht")
    // Not zero: the step is a divisor, and "round up to the nearest nothing" is
    // not a weaker instruction, it is an undefined one. 1 means to the baht.
    .min(1, "Round to at least 1 baht")
    .max(100000, "That step is larger than any course price in this demo")
    .optional(),
  driver: z.enum(["credits"]).optional(),
  status: z.enum(["draft", "review", "approved"]).optional(),
});

export type ProgramCostSheetUpdateInput = z.infer<typeof programCostSheetUpdateSchema>;
