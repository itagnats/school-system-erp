import { z } from "zod";
import type { Course } from "@/types";
import { paginatedSchema } from "./list";

/**
 * The wire shape of a course.
 *
 * `satisfies z.ZodType<Course>` is the point of this file: the domain type in
 * `types/course.ts` stays the single hand-written definition, and this schema
 * is checked against it at compile time. If the two drift, the build fails
 * rather than the browser doing so.
 */
export const courseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  credits: z.number(),
  status: z.enum(["draft", "active", "archived"]),
  offeredIn: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Course>;

export const courseListSchema = paginatedSchema(courseSchema);

/** Filters this endpoint accepts on top of the shared list query. */
export const courseFilterSchema = z.object({
  status: z.enum(["draft", "active", "archived"]).optional(),
  semester: z.string().regex(/^\d{6}$/).optional(),
});
