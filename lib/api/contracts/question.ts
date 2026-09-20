import { z } from "zod";
import { EVALUATION_CRITERIA, EVALUATION_ROLES } from "@/types";

/**
 * Question bank wire shapes (direction.md §18a).
 *
 * One rule here needs the server rather than the form, for the same reason the
 * weight blend does: a `rating` question with no criterion feeds nothing, and a
 * `text` question with one would quietly enter a score it is not supposed to be
 * part of. Neither produces an error anywhere downstream - the first is simply
 * never scored, and the second scores something nobody meant to ask.
 */

const questionStatus = z.enum(["active", "archived"]);
const questionType = z.enum(["rating", "text"]);
const criterion = z.enum(EVALUATION_CRITERIA);
const role = z.enum(EVALUATION_ROLES);

const prompt = z
  .string()
  .trim()
  .min(10, "A prompt is a question somebody reads - give it at least 10 characters")
  .max(240, "A prompt that long will not fit on the form. Move the detail into help text");

const helpText = z
  .string()
  .trim()
  .max(400, "Help text is a sentence or two, not an explanation of the course")
  .optional();

const appliesTo = z
  .array(role)
  .min(1, "Pick at least one role this can be asked about")
  .refine(
    (roles) => new Set(roles).size === roles.length,
    "A role can only be listed once",
  );

/**
 * The type decides whether a criterion is allowed.
 *
 * Checked on the object rather than the field, because neither half means
 * anything alone: `rating` needs one and `text` must not have one. Written as
 * two predicates applied to both schemas rather than a generic wrapper - a
 * wrapper over `z.ZodTypeAny` loses the shape it is refining, and the error it
 * produces is about Zod's generics rather than about questions.
 */
const RATING_NEEDS_CRITERION = {
  path: ["criterion"],
  message: "A rating question has to feed one of the scoring criteria",
};

const TEXT_TAKES_NO_CRITERION = {
  path: ["criterion"],
  message:
    "A text question is not scored, so it cannot feed a criterion. Make it a rating question instead",
};

type CriterionShape = { type: "rating" | "text"; criterion?: string };

const ratingHasCriterion = (value: CriterionShape) =>
  value.type !== "rating" || Boolean(value.criterion);

const textHasNoCriterion = (value: CriterionShape) =>
  value.type !== "text" || !value.criterion;

export const questionCreateSchema = z
  .object({
    groupId: z.string().min(1),
    type: questionType,
    criterion: criterion.optional(),
    prompt,
    helpText,
    appliesTo,
  })
  .refine(ratingHasCriterion, RATING_NEEDS_CRITERION)
  .refine(textHasNoCriterion, TEXT_TAKES_NO_CRITERION);

/**
 * Declared field by field rather than from `.partial()`, which keeps each
 * field's default and silently wipes what a PATCH left out. That shipped once
 * on courses and is pinned by a contract test.
 */
export const questionUpdateSchema = z
  .object({
    type: questionType,
    criterion: criterion.optional(),
    prompt,
    helpText,
    appliesTo,
    status: questionStatus.optional(),
  })
  .refine(ratingHasCriterion, RATING_NEEDS_CRITERION)
  .refine(textHasNoCriterion, TEXT_TAKES_NO_CRITERION);

export const questionGroupCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "A group name needs at least 3 characters")
    .max(80, "That name is too long for a group heading"),
  description: z
    .string()
    .trim()
    .max(400, "A group description is a sentence, not a paragraph")
    .optional(),
});

export const questionGroupUpdateSchema = questionGroupCreateSchema.extend({
  status: questionStatus.optional(),
});

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

export const questionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  type: questionType,
  criterion: criterion.optional(),
  prompt: z.string(),
  helpText: z.string().optional(),
  appliesTo: z.array(role),
  status: questionStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const questionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: questionStatus,
  questions: z.array(questionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The bank is returned whole rather than paginated, for the reason the
 * catalog is: it is read by group, and a page boundary inside a group splits
 * the thing being maintained.
 */
export const questionBankSchema = z.object({
  groups: z.array(questionGroupSchema),
});

export type QuestionBankResponse = z.infer<typeof questionBankSchema>;

export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;
export type QuestionGroupCreateInput = z.infer<typeof questionGroupCreateSchema>;
export type QuestionGroupUpdateInput = z.infer<typeof questionGroupUpdateSchema>;
