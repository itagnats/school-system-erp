/**
 * Barrel for the domain model. Import from `@/types` in application code; the
 * per-domain files stay small and focused (scaffold.md §10).
 */
export type * from "./common";
export type * from "./course";
export type * from "./program";
export type * from "./semester";
export type * from "./student";
export type * from "./enrollment";
export type * from "./cost";
export type * from "./evaluation";
export type * from "./report";

export { ENROLLMENT_STATUSES } from "./enrollment";
export {
  EVALUATOR_ROLES,
  EVALUATION_CRITERIA,
  EVALUATION_GROUP_LETTERS,
  evaluationGroupName,
} from "./evaluation";
