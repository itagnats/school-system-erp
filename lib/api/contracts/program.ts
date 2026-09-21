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

/**
 * What may be changed about a term: the price, the status, and the curriculum.
 *
 * **The curriculum is sent whole, never as add / remove / move operations**
 * (added 2026-09-21). `courseIds` *is* the teaching order (§4a), so a reorder
 * has no expression as a partial edit — and three endpoints that each rewrite
 * the same field are three ways for it to end up wrong. One array, one write.
 *
 * Duplicates and emptiness are refused here because neither needs the store to
 * detect. Everything that does — whether a course exists, whether it runs that
 * semester, whether it is still active — is checked in the service, against
 * the curriculum as it stands.
 */
export const programTermUpdateSchema = z.object({
  packagePrice: z
    .number({ message: "The package price must be a number" })
    .min(0, "A package price cannot be negative")
    .max(1_000_000, "That is larger than any package in this demo")
    .optional(),
  status: z.enum(["planning", "open", "closed"]).optional(),
  courseIds: z
    .array(z.string().min(1), { message: "The curriculum must be a list of courses" })
    .min(1, "A term has to teach at least one course")
    .max(12, "That is more courses than any term in this demo")
    // A curriculum is an order, and a course cannot be in two places in one.
    // The seeded terms hold 2-4 courses each and none repeats one.
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "A course can only appear once in a curriculum",
    )
    .optional(),
});

export type ProgramTermUpdateInput = z.infer<typeof programTermUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Programs (added 2026-09-21)                                                */
/* -------------------------------------------------------------------------- */

/**
 * A program as the Curriculum list shows it.
 *
 * Carries no money at all, not even the package price: a price belongs to a
 * *term*, because the same curriculum is worth different money in different
 * semesters (§4a, and §13a on where money is allowed to appear).
 */
export const programSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  credential: z.string(),
  status: z.enum(["draft", "active", "archived"]),
  termCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
  latestSemesterCode: z.string().nullable(),
});

export const programListSchema = paginatedSchema(programSummarySchema);

export type ProgramSummaryResponse = z.infer<typeof programSummarySchema>;

/** The editable fields of a program, without defaults - see `courseFields`. */
const programFields = {
  code: z
    .string()
    .trim()
    .min(3, "A program code needs at least three characters")
    .max(12, "A program code is at most twelve characters")
    .regex(
      /^[A-Z]{2,4}(-[A-Z]{2,4})?$/,
      "Use a code like BSC-IT: letters, optionally two groups joined by a hyphen",
    ),
  name: z
    .string()
    .trim()
    .min(3, "A program needs a name")
    .max(80, "That name is too long for a table cell"),
  description: z.string().trim().max(400, "Keep the description under 400 characters"),
  credential: z
    .string()
    .trim()
    .min(3, "Say what the student comes away with")
    .max(60, "That credential name is too long"),
  status: z.enum(["draft", "active", "archived"]),
};

/**
 * The first term, created in the same request as its program.
 *
 * **Not optional, and that is the whole design** (`AUD-036`). A created record
 * never reaches the store, so a program made on its own could be listed and
 * never opened — and "now add a term inside it" would 404. Creating the two
 * together means nothing has to be navigated into.
 *
 * `packagePrice` is typed rather than derived. The computed figure is the
 * *preferred price* — cost per student, rounded up — and it cannot exist yet,
 * because a brand-new term's cost sheets are empty. It appears on the term
 * page later as a suggestion (§13).
 */
export const programFirstTermSchema = z.object({
  semesterCode: z.string().regex(/^\d{6}$/, "A semester code looks like 202601"),
  courseIds: z
    .array(z.string().min(1))
    .min(1, "A term has to teach at least one course")
    .max(12, "That is more courses than any term in this demo")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "A course can only appear once in a curriculum",
    ),
  packagePrice: z
    .number({ message: "The package price must be a number" })
    .min(0, "A package price cannot be negative")
    .max(1_000_000, "That is larger than any package in this demo"),
});

export const programCreateSchema = z.object({
  ...programFields,
  firstTerm: programFirstTermSchema,
});

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;

/** Adding a later term to a program that already exists. */
export const programTermCreateSchema = programFirstTermSchema.extend({
  programId: z.string().min(1),
});

export type ProgramTermCreateInput = z.infer<typeof programTermCreateSchema>;
