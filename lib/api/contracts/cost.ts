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
  totalCost: z.number(),
  costPerStudent: z.number().nullable(),
  updatedAt: z.string(),
});

export const costSheetListSchema = paginatedSchema(costSheetListItemSchema);

export type CostSheetListResponse = z.infer<typeof costSheetListSchema>;

/**
 * What a client may change on a cost sheet.
 *
 * Only the three inputs the total actually depends on. The groups, items and
 * options are not editable here: changing them is a different, larger screen,
 * and allowing a partial nested write through this endpoint would make the
 * recomputed breakdown impossible to reason about.
 */
export const costSheetUpdateSchema = z.object({
  markupPercent: z
    .number({ message: "Markup must be a number" })
    .min(0, "Markup cannot be negative")
    .max(100, "A markup over 100 percent is almost certainly a typo")
    .optional(),
  studentCount: z
    .number({ message: "Student count must be a number" })
    .int("A head count is a whole number")
    .min(0, "A head count cannot be negative")
    .max(500, "That is larger than any cohort in this demo")
    .optional(),
  status: z.enum(["draft", "review", "approved"]).optional(),
});

export type CostSheetUpdateInput = z.infer<typeof costSheetUpdateSchema>;
