import type { QuestionGroup } from "@/types";

/**
 * The question bank (direction.md §18a).
 *
 * Hand-written rather than generated: these are the words evaluators read, and
 * a generated prompt would be filler on the one screen where the text *is* the
 * content. Fictional throughout, like every fixture here.
 *
 * Two groups, because what a student is asked about a peer is not what they are
 * asked about their teacher (§18). Every rating question names the criterion it
 * feeds, so wording can be changed freely without touching the scale anything
 * is scored on.
 */

/** Fixed, because the seed must be identical on every process (data-layer skill). */
const CREATED = "2026-01-05T09:00:00.000Z";

export const mockQuestionGroups: QuestionGroup[] = [
  {
    id: "qg-student",
    name: "Assessing a student",
    description:
      "Asked about a student, by peers, an inspector, the teacher or the TA. Which of these a relation is actually asked is set per evaluation.",
    status: "active",
    createdAt: CREATED,
    updatedAt: CREATED,
    questions: [
      {
        id: "qn-student-participation",
        groupId: "qg-student",
        type: "rating",
        criterion: "participation",
        prompt: "How consistently did they take part in the group's work?",
        helpText:
          "Turning up and joining in, rather than the quality of what they contributed.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-teamwork",
        groupId: "qg-student",
        type: "rating",
        criterion: "teamwork",
        prompt: "How reliably did they carry their share of the work?",
        helpText:
          "A low answer means others repeatedly covered for them; a high one that the group could plan around them.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-communication",
        groupId: "qg-student",
        type: "rating",
        criterion: "communication",
        prompt: "How clearly did they explain their thinking to the rest of the group?",
        helpText: "Being understood, not being talkative.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-problem-solving",
        groupId: "qg-student",
        type: "rating",
        criterion: "problemSolving",
        prompt: "When the group got stuck, how much did they help it move again?",
        helpText:
          "Judge the contribution to getting unstuck, whether or not the idea was theirs.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-responsibility",
        groupId: "qg-student",
        type: "rating",
        criterion: "responsibility",
        prompt: "How dependable were they with what they had agreed to do?",
        helpText: "Deadlines met, and problems raised early rather than at the end.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-leadership",
        groupId: "qg-student",
        type: "rating",
        criterion: "leadership",
        prompt: "How much did they help the group organise itself?",
        helpText:
          "Leading is not the same as talking most. Somebody who quietly kept the plan straight scores well here.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-technical",
        groupId: "qg-student",
        type: "rating",
        criterion: "technicalContribution",
        prompt: "How strong was the technical work they produced?",
        helpText:
          "The work itself. Asked of the teacher and the TA, who see it closely enough to judge.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-strength-note",
        groupId: "qg-student",
        type: "text",
        prompt: "What did this person do that the group should keep?",
        helpText:
          "Not scored. It reaches their report attributed to your role, never to you by name.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-student-improve-note",
        groupId: "qg-student",
        type: "text",
        prompt: "What is the one thing you would ask them to do differently?",
        helpText: "Not scored. Write it as advice they could act on next semester.",
        appliesTo: ["student"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
  },
  {
    id: "qg-staff",
    name: "Assessing a teacher or TA",
    description:
      "Upward feedback. A narrower set: students can speak to how a teacher communicates and leads a session, and are not placed to grade their technical work (§18).",
    status: "active",
    createdAt: CREATED,
    updatedAt: CREATED,
    questions: [
      {
        id: "qn-staff-communication",
        groupId: "qg-staff",
        type: "rating",
        criterion: "communication",
        prompt: "How clearly were the ideas in this course explained?",
        helpText: "Whether you understood, rather than whether the material was easy.",
        appliesTo: ["teacher", "ta"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-staff-leadership",
        groupId: "qg-staff",
        type: "rating",
        criterion: "leadership",
        prompt: "How well were the sessions run and kept on track?",
        appliesTo: ["teacher", "ta"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-staff-problem-solving",
        groupId: "qg-staff",
        type: "rating",
        criterion: "problemSolving",
        prompt: "When you were stuck, how useful was the help you got?",
        helpText: "Judge the help you actually asked for, not help you did not seek.",
        appliesTo: ["teacher", "ta"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-staff-participation",
        groupId: "qg-staff",
        type: "rating",
        criterion: "participation",
        prompt: "How available were they when the group needed them?",
        appliesTo: ["ta"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-staff-note",
        groupId: "qg-staff",
        type: "text",
        prompt: "What would have helped you most in this course?",
        helpText:
          "Not scored. Reaches their feedback report attributed to your role, never to you.",
        appliesTo: ["teacher", "ta"],
        status: "active",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "qn-staff-retired-pace",
        groupId: "qg-staff",
        type: "rating",
        criterion: "responsibility",
        prompt: "Was the pace of the course about right?",
        helpText:
          "Archived: a mid-point answer is ambiguous here, because too slow and too fast both sit away from the middle in opposite directions.",
        appliesTo: ["teacher"],
        status: "archived",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
  },
];
