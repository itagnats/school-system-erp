import { z } from "zod";

/**
 * Validation primitives shared across features. A schema that belongs to one
 * feature lives in that feature instead (scaffold.md §13).
 *
 * Server-side validation is the real gate. These schemas run in the browser to
 * give the user immediate feedback, and the same shapes are meant to be applied
 * again wherever the request is handled. A schema used only on the client is a
 * usability feature, never a security control.
 */

/** Trimmed, bounded free text. Rejects a whitespace-only value. */
export const requiredText = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (max = 200) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/** Course code: two to four letters followed by three digits, e.g. IT101. */
export const courseCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,4}\d{3}$/, "Use a code such as IT101.");

/** Semester code: YYYYNN, e.g. 202602. */
export const semesterCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}(0[1-9]|1[0-2])$/, "Use a code such as 202602.");

/** Student ID: ST-YYYY-NNN. */
export const studentIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^ST-\d{4}-\d{3}$/, "Use an ID such as ST-2026-001.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);

/** Permissive on format, strict on length: phone conventions vary. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s+()-]{6,20}$/, "Enter a valid phone number.");

/** ISO calendar date, e.g. 2026-06-01. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

/** Money: non-negative, at most two decimals, bounded to catch fat fingers. */
export const moneySchema = z
  .number()
  .nonnegative("Cannot be negative.")
  .max(1_000_000_000, "That figure is implausibly large.")
  .refine((v) => Number.isFinite(v) && Math.round(v * 100) === v * 100, {
    message: "Use at most two decimal places.",
  });

export const percentSchema = z
  .number()
  .min(0, "Cannot be below 0%.")
  .max(100, "Cannot be above 100%.");

/** The 1-5 evaluation rating (direction.md §18). */
export const ratingSchema = z
  .number()
  .int("Choose a whole rating.")
  .min(1)
  .max(5);

/**
 * A date range where the end must not precede the start. Applied with
 * `.superRefine` on the parent object so the error lands on `endDate`.
 */
export const dateRangeRefinement = <
  T extends { startDate: string; endDate: string },
>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (value.endDate < value.startDate) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "The end date cannot be before the start date.",
    });
  }
};
