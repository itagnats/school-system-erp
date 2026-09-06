import { z } from "zod";
import { paginatedSchema } from "./list";
import { EVALUATION_CRITERIA, EVALUATOR_ROLES } from "@/types";

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
const evaluatorRole = z.enum(EVALUATOR_ROLES);
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
  threeSixtyForm: readiness,
  rankingForm: readiness,
  weightRemainingPercent: z.number(),
});

export const evaluationSetupListSchema = paginatedSchema(evaluationSetupSummarySchema);

export type EvaluationSetupSummaryResponse = z.infer<typeof evaluationSetupSummarySchema>;

/**
 * One role's configuration, as a client may submit it.
 *
 * Only the ranking half of the split crosses the wire. The 360 share is always
 * its complement, and sending both would create two numbers that have to agree
 * - so the schema simply does not offer the chance.
 */
export const roleConfigSchema = z.object({
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
 * The role configuration, checked as a whole.
 *
 * Four rules that a per-field schema cannot express, so they are refinements on
 * the array:
 *
 *   - the enabled roles must total 100, or every score in the course is scaled
 *     wrongly and nothing downstream can detect it;
 *   - a role may appear once. A duplicate would be silently counted twice by
 *     any reducer over the list;
 *   - at least one role must evaluate;
 *   - a role paid for the 360 form must have questions to ask. This became
 *     possible when question sets went per-role: the blend can total 100 and
 *     still be unable to produce a score, because an empty question set
 *     contributes nothing to the half it is weighted for.
 *
 * The weight tolerance is 0.01 rather than exact equality, because these arrive
 * as renormalised percentages rounded to two places.
 */
export const roleConfigsSchema = z
  .array(roleConfigSchema)
  .min(1, "At least one evaluator role is required")
  .max(EVALUATOR_ROLES.length, "There are only four evaluator roles")
  .refine(
    (roles) => new Set(roles.map((role) => role.role)).size === roles.length,
    "Each evaluator role may appear once",
  )
  .refine((roles) => roles.some((role) => role.enabled), {
    message: "At least one evaluator role must be enabled",
  })
  .refine(
    (roles) => {
      const total = roles
        .filter((role) => role.enabled)
        .reduce((sum, role) => sum + role.weightPercent, 0);
      return Math.abs(100 - total) <= 0.01;
    },
    { message: "The enabled role weights must total 100%" },
  )
  .refine(
    (roles) =>
      roles.every(
        (role) =>
          !role.enabled || role.rankingSharePercent >= 100 || role.criteria.length > 0,
      ),
    { message: "A role that answers the 360 form must be asked at least one criterion" },
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
  roles: roleConfigsSchema.optional(),
});

export type EvaluationSetupUpdateInput = z.infer<typeof evaluationSetupUpdateSchema>;
