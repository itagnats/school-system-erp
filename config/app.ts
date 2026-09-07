import type { AssesseeConfig } from "@/types";

/** Static application metadata. No secrets, no runtime values. */
export const APP = {
  name: "PRIME",
  fullName: "PRIME School Management",
  description:
    "Course, enrollment, cost and 360 degree evaluation management for a school.",
  /** Shown in the sidebar footer and the design system page. */
  version: "0.1.0",
} as const;

/**
 * The default evaluation configuration (direction.md 16, 18, 20).
 *
 * Here rather than in `data/mock/` because both halves of the application need
 * it: the seed builds every setup from it, and the setup screen offers it as
 * "Use defaults" so an administrator can accept a sound blend without opening a
 * single control. A fixture import would drag seed prose into the client bundle.
 *
 * Superseded the flat per-role weight map this constant used to hold. That
 * shape assumed the assessee was always a student, which stopped being true on
 * 2026-09-06.
 */
export const DEFAULT_ASSESSEE_CONFIG = [
  {
    role: "student",
    selfEvaluation: false,
    assessors: [
      { role: "student", enabled: true, weightPercent: 30, rankingSharePercent: 40, criteria: ["participation", "teamwork", "communication", "problemSolving", "responsibility", "leadership"] },
      { role: "inspector", enabled: true, weightPercent: 20, rankingSharePercent: 30, criteria: ["participation", "teamwork", "communication", "responsibility", "leadership"] },
      { role: "teacher", enabled: true, weightPercent: 35, rankingSharePercent: 30, criteria: ["participation", "teamwork", "communication", "problemSolving", "responsibility", "leadership", "technicalContribution"] },
      { role: "ta", enabled: true, weightPercent: 15, rankingSharePercent: 0, criteria: ["participation", "teamwork", "communication", "problemSolving", "technicalContribution"] },
    ],
  },
  {
    role: "teacher",
    selfEvaluation: false,
    assessors: [
      { role: "student", enabled: true, weightPercent: 70, rankingSharePercent: 0, criteria: ["communication", "leadership", "participation"] },
      { role: "ta", enabled: true, weightPercent: 30, rankingSharePercent: 0, criteria: ["communication", "teamwork", "responsibility", "leadership"] },
    ],
  },
  {
    role: "ta",
    selfEvaluation: false,
    assessors: [
      { role: "student", enabled: true, weightPercent: 50, rankingSharePercent: 0, criteria: ["communication", "participation", "teamwork"] },
      { role: "teacher", enabled: true, weightPercent: 50, rankingSharePercent: 0, criteria: ["communication", "teamwork", "responsibility", "technicalContribution"] },
    ],
  },
] as const satisfies readonly AssesseeConfig[];

/** Grade thresholds, highest first (direction.md §22). */
export const GRADE_THRESHOLDS = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
