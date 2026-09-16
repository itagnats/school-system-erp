import type {
  EvaluationCriterion,
  EvaluationKind,
  EvaluationStatus,
  EvaluationWindowStatus,
  EvaluationRole,
  FormReadiness,
  Option,
  RankingScope,
  RatingValue,
  StatusTone,
} from "@/types";
import { EVALUATION_CRITERIA, EVALUATION_ROLES } from "@/types";

/**
 * Evaluation vocabulary: the words and tones this domain uses.
 *
 * This file exists so that no shared component has to learn them. `StatusBadge`
 * knows six visual tones and nothing about evaluation; the mapping from an
 * evaluation status onto one of those tones happens here (direction.md §29).
 *
 * Labels live here rather than inline in JSX for the same reason a calculation
 * does: one definition, one place to change it, and a screen cannot quietly
 * disagree with the screen next to it.
 */

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A tone is a visual weight, not a meaning. The label below always states the
 * status in words, so the badge never carries it in colour alone.
 */
export const EVALUATION_STATUS_TONE: Record<EvaluationStatus, StatusTone> = {
  "not-started": "neutral",
  draft: "warning",
  submitted: "success",
};

export const EVALUATION_STATUS_LABEL: Record<EvaluationStatus, string> = {
  "not-started": "Not started",
  draft: "Draft",
  submitted: "Submitted",
};

export const EVALUATION_STATUS_OPTIONS: Option<EvaluationStatus>[] = (
  ["not-started", "draft", "submitted"] as const
).map((value) => ({ value, label: EVALUATION_STATUS_LABEL[value] }));

/* -------------------------------------------------------------------------- */
/* Evaluator roles                                                            */
/* -------------------------------------------------------------------------- */

/**
 * How a role reads when it is doing the assessing.
 *
 * `student` is "Peer" here, which is what the role means from the subject's
 * point of view - the person beside you in your group.
 */
export const EVALUATION_ROLE_LABEL: Record<EvaluationRole, string> = {
  student: "Peer",
  inspector: "Inspector",
  teacher: "Teacher",
  ta: "TA",
};

/**
 * How a role reads when it is being assessed.
 *
 * The same value needs two labels, because "Peer" describes a relationship and
 * an assessee has no relationship to itself. A card headed "Peer" is nonsense;
 * the role being assessed is a **Student**. Only `student` differs - the other
 * three name a position rather than a relationship, so they read the same on
 * both sides.
 */
export const ASSESSEE_ROLE_LABEL: Record<EvaluationRole, string> = {
  ...EVALUATION_ROLE_LABEL,
  student: "Student",
};

/**
 * Shown next to a role wherever the blend is explained. The inspector line is
 * the one people ask about, so it says where the evaluator comes from.
 */
export const EVALUATION_ROLE_DESCRIPTION: Record<EvaluationRole, string> = {
  student: "Other students in the same evaluation group",
  inspector: "A student from a different evaluation group",
  teacher: "The teacher's authoritative assessment",
  ta: "The teaching assistant's perspective",
};

export const EVALUATION_ROLE_OPTIONS: Option<EvaluationRole>[] = EVALUATION_ROLES.map(
  (value) => ({
    value,
    label: EVALUATION_ROLE_LABEL[value],
    description: EVALUATION_ROLE_DESCRIPTION[value],
  }),
);

/* -------------------------------------------------------------------------- */
/* Criteria and the rating scale                                              */
/* -------------------------------------------------------------------------- */

export const EVALUATION_CRITERION_LABEL: Record<EvaluationCriterion, string> = {
  participation: "Participation",
  teamwork: "Teamwork",
  communication: "Communication",
  problemSolving: "Problem solving",
  responsibility: "Responsibility",
  leadership: "Leadership",
  technicalContribution: "Technical contribution",
};

export const EVALUATION_CRITERION_OPTIONS: Option<EvaluationCriterion>[] =
  EVALUATION_CRITERIA.map((value) => ({
    value,
    label: EVALUATION_CRITERION_LABEL[value],
  }));

/** The 1-5 scale from direction.md §18. */
export const RATING_LABEL: Record<RatingValue, string> = {
  1: "Needs improvement",
  2: "Developing",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export const RATING_VALUES: RatingValue[] = [1, 2, 3, 4, 5];

/* -------------------------------------------------------------------------- */
/* Ranking                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A ranking is ambiguous unless its scope is stated (direction.md §21), so the
 * scope is a label the UI is expected to render, not an implementation detail.
 */
export const RANKING_SCOPE_LABEL: Record<RankingScope, string> = {
  group: "Within evaluation group",
  "course-semester": "Across course and semester",
};

export const RANKING_SCOPE_OPTIONS: Option<RankingScope>[] = (
  ["group", "course-semester"] as const
).map((value) => ({ value, label: RANKING_SCOPE_LABEL[value] }));

/* -------------------------------------------------------------------------- */
/* The evaluation window                                                      */
/* -------------------------------------------------------------------------- */

export const WINDOW_STATUS_LABEL: Record<EvaluationWindowStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  published: "Published",
};

export const WINDOW_STATUS_TONE: Record<EvaluationWindowStatus, StatusTone> = {
  draft: "neutral",
  open: "success",
  closed: "warning",
  published: "info",
};

export const WINDOW_STATUS_OPTIONS: Option<EvaluationWindowStatus>[] = (
  ["draft", "open", "closed", "published"] as const
).map((value) => ({ value, label: WINDOW_STATUS_LABEL[value] }));

/** What each window status means for the people who have to act on it. */
export const WINDOW_STATUS_DESCRIPTION: Record<EvaluationWindowStatus, string> = {
  draft: "Nobody can submit yet. Configure the blend, then open the window.",
  open: "Evaluators can submit. Settings are usually locked while this runs.",
  closed: "Submissions have stopped. Scores can be reviewed before reports go out.",
  published: "Reports are available to their readers. This is the last state.",
};

/**
 * A window move, as the button that makes it.
 *
 * The verb depends on the pair rather than the target: `closed -> open` is a
 * reopening and reads as a correction, where `draft -> open` is the evaluation
 * starting. Same destination, different act.
 */
export function windowAction(
  from: EvaluationWindowStatus,
  to: EvaluationWindowStatus,
): { label: string; confirm?: { title: string; description: string } } {
  if (to === "open") {
    return from === "closed"
      ? {
          label: "Reopen",
          confirm: {
            title: "Reopen this evaluation?",
            description:
              "Evaluators will be able to submit again, and any score already reviewed can change. Reopening is recorded as a deliberate act.",
          },
        }
      : { label: "Open evaluation" };
  }
  if (to === "closed") {
    return {
      label: "Close",
      confirm: {
        title: "Close this evaluation?",
        description:
          "Evaluators can no longer submit. Anyone part-way through a form keeps what they sent, and the rest is lost.",
      },
    };
  }
  return {
    label: "Publish reports",
    confirm: {
      title: "Publish the reports?",
      description:
        "Reports become available to their readers, and a published evaluation cannot be moved again. Check the blend and the scores first.",
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Form readiness                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The three states a form kind can be in, in words.
 *
 * "Not applicable" is the one that has to be distinguishable at a glance from
 * "not configured": a blend that gives the ordering no weight is a finished
 * decision, not an unfinished setup, and marking it as a failure would push
 * someone to fix a configuration that is already right.
 */
export const READINESS_LABEL: Record<FormReadiness, string> = {
  ready: "Configured",
  "not-configured": "Not configured",
  "not-applicable": "Not used",
};

export const READINESS_TONE: Record<FormReadiness, StatusTone> = {
  ready: "success",
  "not-configured": "error",
  "not-applicable": "neutral",
};

/** What each kind of form asks an evaluator to do. */
export const EVALUATION_KIND_LABEL: Record<EvaluationKind, string> = {
  "360": "360 form",
  ranking: "Ranking form",
};

/**
 * All four roles take the 360 form - a teacher assesses a student, and students
 * assess each other. What differs is the question set, not the kind of form,
 * which is why this is not called the "criteria form".
 */
export const EVALUATION_KIND_DESCRIPTION: Record<EvaluationKind, string> = {
  "360": "Assess one subject at a time, against the criteria your role is asked",
  ranking: "Put every subject in scope into an order, strongest first",
};
