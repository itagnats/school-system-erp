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

/**
 * What a client may send when creating or editing a course.
 *
 * Separate from `courseSchema` on purpose: the response carries `id`,
 * `createdAt` and `updatedAt`, and a client that could set those would be able
 * to rewrite history. A request schema that is merely the response schema with
 * fields made optional is how that happens by accident.
 */
/**
 * The editable fields of a course, without defaults.
 *
 * Defaults belong to creation only. `courseCreateSchema.partial()` looks like
 * the right way to build the update schema and is not: `.partial()` makes a key
 * optional but leaves its default in place, so a PATCH carrying only `status`
 * comes out of validation with `description: ""` and `offeredIn: []` filled in,
 * and merging that over the stored record silently wipes both. That bug shipped
 * once and was caught by curling the endpoint, not by the type checker.
 */
const courseFields = {
  code: z
    .string()
    .trim()
    .min(3, "A course code needs at least three characters")
    .max(10, "A course code is at most ten characters")
    .regex(/^[A-Z]{2,4}\d{3}$/, "Use a code like IT101: two to four letters, then three digits"),
  name: z
    .string()
    .trim()
    .min(3, "Give the course a name")
    .max(120, "That name is too long to fit a table row"),
  description: z.string().trim().max(400, "Keep the description under 400 characters"),
  credits: z
    .number({ message: "Credits must be a number" })
    .int("Credits are whole numbers")
    .min(1, "A course is worth at least one credit")
    .max(12, "Twelve credits is the maximum"),
  status: z.enum(["draft", "active", "archived"]),
  offeredIn: z.array(z.string().regex(/^\d{6}$/, "A semester code looks like 202601")),
};

/**
 * What a client may send when creating a course.
 *
 * Separate from `courseSchema` on purpose: the response carries `id`,
 * `createdAt` and `updatedAt`, and a client that could set those would be able
 * to rewrite history. A request schema that is merely the response schema with
 * fields made optional is how that happens by accident.
 */
export const courseCreateSchema = z.object({
  ...courseFields,
  description: courseFields.description.default(""),
  offeredIn: courseFields.offeredIn.default([]),
});

export type CourseCreateInput = z.infer<typeof courseCreateSchema>;

/** Editing sends the same fields, all optional, and none defaulted. */
export const courseUpdateSchema = z.object(courseFields).partial();

export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;

/** The status toggle sends only a status, so it validates only a status. */
export const courseStatusSchema = z.object({
  status: z.enum(["draft", "active", "archived"]),
});
