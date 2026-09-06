import { z } from "zod";
import { paginatedSchema } from "./list";
import { EVALUATOR_ROLES } from "@/types";

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
  criteriaForm: readiness,
  rankingForm: readiness,
  weightRemainingPercent: z.number(),
});

export const evaluationSetupListSchema = paginatedSchema(evaluationSetupSummarySchema);

export type EvaluationSetupSummaryResponse = z.infer<typeof evaluationSetupSummarySchema>;

/**
 * One role's weight, as a client may submit it.
 *
 * `criteriaSharePercent` is the only half of the split that crosses the wire.
 * The ranking share is always its complement, and sending both would create two
 * numbers that have to agree - so the schema simply does not offer the chance.
 */
export const roleWeightSchema = z.object({
  role: evaluatorRole,
  enabled: z.boolean(),
  weightPercent: z
    .number({ message: "A weight must be a number" })
    .min(0, "A weight cannot be negative")
    .max(100, "A weight cannot exceed 100%"),
  criteriaSharePercent: z
    .number({ message: "A criteria share must be a number" })
    .min(0, "A share cannot be negative")
    .max(100, "A share cannot exceed 100%"),
});

/**
 * The blend, checked as a whole.
 *
 * Two rules that a per-field schema cannot express, so they are refinements on
 * the array:
 *
 *   - the enabled roles must total 100, or every score in the course is scaled
 *     wrongly and nothing downstream can detect it;
 *   - a role may appear once. A duplicate would be silently counted twice by
 *     any reducer over the list.
 *
 * The tolerance is 0.01 rather than exact equality, because these arrive as
 * renormalised percentages rounded to two places.
 */
export const roleWeightsSchema = z
  .array(roleWeightSchema)
  .min(1, "At least one evaluator role is required")
  .max(EVALUATOR_ROLES.length, "There are only four evaluator roles")
  .refine(
    (weights) => new Set(weights.map((weight) => weight.role)).size === weights.length,
    "Each evaluator role may appear once",
  )
  .refine((weights) => weights.some((weight) => weight.enabled), {
    message: "At least one evaluator role must be enabled",
  })
  .refine(
    (weights) => {
      const total = weights
        .filter((weight) => weight.enabled)
        .reduce((sum, weight) => sum + weight.weightPercent, 0);
      return Math.abs(100 - total) <= 0.01;
    },
    { message: "The enabled role weights must total 100%" },
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
  weights: roleWeightsSchema.optional(),
});

export type EvaluationSetupUpdateInput = z.infer<typeof evaluationSetupUpdateSchema>;
