import { z } from "zod";
import { paginatedSchema } from "./list";
import { EVALUATION_CRITERIA, EVALUATION_ROLES } from "@/types";

/**
 * Evaluation wire shapes.
 *
 * The setup is the one part of evaluation an administrator writes to, so this
 * is where server-side validation earns its keep: a weight blend that does not
 * total 100 produces a score that is quietly wrong for everybody in the course,
 * and no amount of client-side care can be trusted to prevent it.
 */

const windowStatus = z.enum(["draft", "open", "closed", "published"]);
const readiness = z.enum(["ready", "not-configured", "not-applicable"]);
const evaluatorRole = z.enum(EVALUATION_ROLES);
const criterion = z.enum(EVALUATION_CRITERIA);

export const evaluationSetupSummarySchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  semesterCode: z.string(),
  status: windowStatus,
  shortName: z.string(),
  memberCount: z.number().int().nonnegative(),
  groupCount: z.number().int().nonnegative(),
  ungroupedCount: z.number().int().nonnegative(),
  assesseeCount: z.number().int().nonnegative(),
  assesseeRoles: z.array(evaluatorRole),
  threeSixtyForm: readiness,
  rankingForm: readiness,
  unbalancedAssesseeCount: z.number().int().nonnegative(),
});

export const evaluationSetupListSchema = paginatedSchema(evaluationSetupSummarySchema);

export type EvaluationSetupSummaryResponse = z.infer<typeof evaluationSetupSummarySchema>;

/**
 * One assessor inside one assessee, as a client may submit it.
 *
 * Only the ranking half of the split crosses the wire. The 360 share is always
 * its complement, and sending both would create two numbers that have to agree
 * - so the schema simply does not offer the chance.
 */
export const assessorConfigSchema = z.object({
  role: evaluatorRole,
  enabled: z.boolean(),
  weightPercent: z
    .number({ message: "A weight must be a number" })
    .min(0, "A weight cannot be negative")
    .max(100, "A weight cannot exceed 100%"),
  rankingSharePercent: z
    .number({ message: "A ranking share must be a number" })
    .min(0, "A share cannot be negative")
    .max(100, "A share cannot exceed 100%"),
  criteria: z
    .array(criterion)
    .max(EVALUATION_CRITERIA.length, "There are only seven criteria")
    .refine(
      (list) => new Set(list).size === list.length,
      "A criterion may appear once in a question set",
    ),
});

/**
 * One assessee card, checked as a whole.
 *
 * Five rules that a per-field schema cannot express, because none can be
 * decided by looking at a single assessor:
 *
 *   - the enabled assessors must total 100, or every score for this assessee is
 *     scaled wrongly and nothing downstream can detect it;
 *   - an assessor role may appear once. A duplicate would be silently counted
 *     twice by any reducer over the list;
 *   - at least one assessor must be enabled, or the assessee is unscoreable;
 *   - nobody assesses themselves (direction.md 16), so the assessee's own role
 *     may not appear among its assessors - and an inspector, being a student
 *     borrowed from another group, may only assess a student;
 *   - an assessor weighted for the 360 form must be asked at least one
 *     criterion, since an empty question set contributes nothing to the half it
 *     is paid for.
 *
 * `selfEvaluation` is deliberately **not** accepted from the client. It is
 * always false and the server sets it, so a crafted request cannot turn it on.
 */
export const assesseeConfigSchema = z
  .object({
    role: evaluatorRole,
    assessors: z
      .array(assessorConfigSchema)
      .min(1, "An assessee needs at least one assessor")
      .max(EVALUATION_ROLES.length, "There are only four evaluation roles"),
  })
  .refine(
    (assessee) =>
      new Set(assessee.assessors.map((a) => a.role)).size === assessee.assessors.length,
    "Each assessor role may appear once per assessee",
  )
  .refine((assessee) => assessee.assessors.some((a) => a.enabled), {
    message: "An assessee needs at least one enabled assessor",
  })
  .refine(
    (assessee) =>
      assessee.assessors.every((a) => a.role !== assessee.role) ||
      assessee.role === "student",
    {
      // A matching pair is peer assessment, not self-assessment - but only
      // where the role holds more than one person. There is one teacher and one
      // TA per course-semester, so a same-role staff pair is the same human.
      message: "Only students can be assessed by their own role, as peers",
    },
  )
  .refine(
    (assessee) =>
      assessee.role === "student" ||
      assessee.assessors.every((a) => a.role !== "inspector"),
    { message: "An inspector only assesses students" },
  )
  .refine(
    (assessee) => {
      const total = assessee.assessors
        .filter((a) => a.enabled)
        .reduce((sum, a) => sum + a.weightPercent, 0);
      return Math.abs(100 - total) <= 0.01;
    },
    { message: "The enabled assessor weights must total 100%" },
  )
  .refine(
    (assessee) =>
      assessee.assessors.every(
        (a) => !a.enabled || a.rankingSharePercent >= 100 || a.criteria.length > 0,
      ),
    { message: "An assessor answering the 360 form must be asked at least one criterion" },
  );

/** Every assessee card. A role may be assessed at most once. */
export const assesseesSchema = z
  .array(assesseeConfigSchema)
  .max(EVALUATION_ROLES.length, "There are only four evaluation roles")
  .refine(
    (assessees) => new Set(assessees.map((a) => a.role)).size === assessees.length,
    "Each role may be assessed at most once",
  );

export const evaluationSetupUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "An evaluation name needs at least 3 characters")
    .max(120, "That name is too long for a report header")
    .optional(),
  shortName: z
    .string()
    .trim()
    .min(2, "A short name needs at least 2 characters")
    .max(24, "A short name has to stay short to fit a table column")
    .optional(),
  status: windowStatus.optional(),
  editingLocked: z.boolean().optional(),
  // The 1-5 scale of direction.md §18. Allowing 3 or 10 here would mean every
  // stored rating had to record the scale it was made on.
  scaleMax: z.literal(5).optional(),
  guidance: z
    .string()
    .trim()
    .max(4000, "That guidance is longer than anyone will read")
    .optional(),
  assessees: assesseesSchema.optional(),
});

export type EvaluationSetupUpdateInput = z.infer<typeof evaluationSetupUpdateSchema>;
