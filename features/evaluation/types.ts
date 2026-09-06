import type {
  EvaluationStatus,
  EvaluationWindowStatus,
  EvaluatorRole,
  ListQuery,
  RankingScope,
  SemesterCode,
} from "@/types";

/**
 * Types local to the evaluation feature.
 *
 * The domain model itself lives in `types/evaluation.ts` and is imported from
 * `@/types` — `Evaluation`, `EvaluationGroup`, `RoleScore`, `ScoreResult`,
 * `RankingEntry` and friends. What belongs *here* is the vocabulary of this
 * feature's own screens: query shapes, form shapes and view models that no
 * other domain has a use for (scaffold.md §10).
 *
 * If something in this file starts being imported by another feature, it was
 * a domain type wearing a disguise and belongs in `types/`.
 */

/**
 * Filters for the evaluation list screen.
 *
 * Flat and all-optional on purpose: this round-trips through URL search params
 * without a serializer, which is what lets a filtered view be refreshed,
 * bookmarked and shared. See `hooks/use-list-query-params.ts`.
 */
export interface EvaluationListFilters extends ListQuery {
  courseId?: string;
  semesterCode?: SemesterCode;
  groupId?: string;
  role?: EvaluatorRole;
  status?: EvaluationStatus;
}

/**
 * Filters for Manage Evaluation.
 *
 * One row is one course-semester setup, so the filters are the three things
 * that identify one: which course, which semester, and where the window has
 * got to.
 */
export interface EvaluationSetupFilters extends ListQuery {
  courseId?: string;
  semester?: SemesterCode;
  status?: EvaluationWindowStatus;
}

/** Filters for the evaluation groups screen. */
export interface EvaluationGroupFilters extends ListQuery {
  courseId?: string;
  semesterCode?: SemesterCode;
}

/**
 * Which set the ranking screen is currently showing.
 *
 * Scope is part of the query rather than a display toggle, because the ranking
 * itself differs: a rank within a group is not a rank across the course. The
 * UI must state which one it is (direction.md §21).
 */
export interface RankingQuery {
  courseId: string;
  semesterCode: SemesterCode;
  scope: RankingScope;
  /** Required when scope is `group`, ignored otherwise. */
  groupId?: string;
}
