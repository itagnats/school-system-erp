import { z } from "zod";
import type { EnrolmentResult, EnrollmentListItem } from "@/types";
import { paginatedSchema } from "./list";
import { studentSummarySchema } from "./student";

export const enrollmentListItemSchema = z.object({
  id: z.string(),
  student: studentSummarySchema,
  courseId: z.string(),
  courseCode: z.string(),
  semesterCode: z.string(),
  status: z.enum([
    "pending",
    "enrolled",
    "active",
    "completed",
    "dropped",
    "cancelled",
  ]),
  evaluationGroupName: z.string().optional(),
}) satisfies z.ZodType<EnrollmentListItem>;

export const enrollmentListSchema = paginatedSchema(enrollmentListItemSchema);

/**
 * A new student profile, collected during enrolment (direction.md §7).
 *
 * "Only collect the minimum information necessary for the initial enrolment",
 * so this is deliberately six fields and not the whole of §9. Experience,
 * emergency contact, photo and the rest belong to profile editing, where
 * someone is doing that job rather than getting a student onto a roster.
 *
 * **Programme is not one of them.** It comes from the term being enrolled into,
 * which is the only value that cannot then disagree with the membership being
 * created beside it.
 */
export const newStudentSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Give the student a first name")
    .max(60, "That first name is too long for a table row"),
  lastName: z
    .string()
    .trim()
    .min(1, "Give the student a last name")
    .max(60, "That last name is too long for a table row"),
  email: z.email("Use an email address like name@example.ac.th"),
  major: z
    .string()
    .trim()
    .min(2, "Name the major")
    .max(80, "That major is too long to fit a profile"),
  yearLevel: z
    .number({ message: "Year level must be a number" })
    .int("Year level is a whole number")
    .min(1, "Year level starts at 1")
    .max(4, "Year level goes up to 4"),
});

export type NewStudentInput = z.infer<typeof newStudentSchema>;

/**
 * The three enrolment paths, as one request.
 *
 * They differ only in how the student is identified — search an existing
 * profile, pick one out of a previous term, or create one — and agree on
 * everything after that. A discriminated union on `source` is what stops a
 * "new student" payload from also carrying a `studentId`, which would leave the
 * server choosing which of two students the caller meant. `Evaluation` uses the
 * same device on `kind` for the same reason.
 *
 * `source` is not metadata: it is stored on every enrollment row it creates, so
 * a roster can still answer how each person got there.
 */
export const enrolRequestSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("existing-profile"),
    programTermId: z.string().min(1, "Choose a programme term"),
    studentId: z.string().min(1, "Choose a student"),
  }),
  z.object({
    source: z.literal("previous-course"),
    programTermId: z.string().min(1, "Choose a programme term"),
    studentId: z.string().min(1, "Choose a student"),
  }),
  z.object({
    source: z.literal("new-student"),
    programTermId: z.string().min(1, "Choose a programme term"),
    student: newStudentSchema,
  }),
]);

export type EnrolRequestInput = z.infer<typeof enrolRequestSchema>;

/**
 * What comes back: the rows as the roster would render them, plus the counts
 * the confirmation needs. The client writes these straight into the cached
 * list, so the shape is the list's shape rather than the store's.
 */
export const enrolResultSchema = z.object({
  student: studentSummarySchema,
  programTermId: z.string(),
  programId: z.string(),
  programName: z.string(),
  semesterCode: z.string(),
  source: z.enum(["existing-profile", "previous-course", "new-student"]),
  enrollments: z.array(enrollmentListItemSchema),
}) satisfies z.ZodType<EnrolmentResult>;
