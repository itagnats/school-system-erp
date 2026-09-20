import { z } from "zod";
import { paginatedSchema } from "./list";

export const semesterSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  academicYear: z.number(),
  term: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["upcoming", "active", "closed"]),
  /** Derived by the service; not stored on the semester. */
  enrollmentCount: z.number().int().nonnegative(),
});

export const semesterListSchema = paginatedSchema(semesterSchema);

export type SemesterResponse = z.infer<typeof semesterSchema>;

/**
 * The editable fields of a semester, without defaults.
 *
 * Split out for the same reason `courseFields` is: `.partial()` makes a key
 * optional and **leaves its default in place**, so a PATCH carrying only a
 * status would come out of validation with the defaulted fields filled in and
 * silently overwrite the stored ones. That bug shipped once on courses and was
 * caught by curling the endpoint, not by the type checker.
 *
 * `code` is not here. A semester code is `YYYYNN` and is derived from the
 * academic year and the term number rather than typed - two fields that can
 * disagree with a third are two chances to disagree. Creation computes it and
 * editing cannot move it, because the code is what every enrollment, cost
 * sheet and invoice in the system joins on.
 */
const semesterFields = {
  name: z
    .string()
    .trim()
    .min(3, "Give the semester a name")
    .max(60, "That name is too long to fit a table row"),
  academicYear: z
    .number({ message: "The academic year must be a number" })
    .int("An academic year is a whole number")
    .min(2000, "That is earlier than any record in this demo")
    .max(2100, "That is further ahead than this demo plans for"),
  term: z
    .number({ message: "The term must be a number" })
    .int("A term number is a whole number")
    .min(1, "Terms are numbered from 1")
    .max(99, "A code only has room for two digits"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-06-01"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-15"),
  status: z.enum(["upcoming", "active", "closed"]),
};

/**
 * What a client may send when creating a semester.
 *
 * The end date is checked against the start date here rather than in the
 * service, because it is a rule about the request and neither field can state
 * it alone. A refinement on the object is the only place it can live.
 */
export const semesterCreateSchema = z
  .object(semesterFields)
  .refine((value) => value.endDate > value.startDate, {
    message: "The end date must fall after the start date",
    path: ["endDate"],
  });

export type SemesterCreateInput = z.infer<typeof semesterCreateSchema>;

/**
 * Editing sends the same fields, all optional, and none defaulted.
 *
 * The date ordering is re-checked only when both dates are present. A PATCH
 * that moves one of them is validated against the stored other in the service,
 * which is the only place both values exist.
 */
export const semesterUpdateSchema = z
  .object(semesterFields)
  .partial()
  .refine(
    (value) =>
      value.startDate === undefined ||
      value.endDate === undefined ||
      value.endDate > value.startDate,
    { message: "The end date must fall after the start date", path: ["endDate"] },
  );

export type SemesterUpdateInput = z.infer<typeof semesterUpdateSchema>;
