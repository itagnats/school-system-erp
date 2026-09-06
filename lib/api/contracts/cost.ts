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
