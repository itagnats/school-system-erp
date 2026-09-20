import type { SemesterCode } from "./common";
import type { StudentSummary } from "./student";

/**
 * Curriculum (direction.md §4a).
 *
 * A program is what a student actually enrols in. It gathers courses into a
 * package per semester and puts a price on that package, which is what turns
 * cost management from bookkeeping into a decision:
 *
 *   Program -> Program Term (one semester) -> Courses
 *                                          -> Package price
 *
 * A course still belongs to itself and can appear in several programs. The
 * term is the join, and it is where the price lives, because the same course
 * list can be worth different money to different programs.
 */

export type ProgramStatus = "draft" | "active" | "archived";

/** Whether a term is open to enrollment. */
export type ProgramTermStatus = "planning" | "open" | "closed";

export interface Program {
  id: string;
  /** Human-facing code, e.g. `BSC-IT`. Unique. */
  code: string;
  name: string;
  description: string;
  /** What the student comes away with, e.g. `Bachelor of Science`. */
  credential: string;
  status: ProgramStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * One semester of a program: the courses it includes and what it costs to
 * buy. This is the unit a student enrols in and the unit profit is measured on.
 */
export interface ProgramTerm {
  id: string;
  programId: string;
  semesterCode: SemesterCode;
  /** The curriculum for this term, in teaching order. */
  courseIds: string[];
  /** What a student pays for the whole package, not per course. */
  packagePrice: number;
  currency: string;
  status: ProgramTermStatus;
}

/**
 * A student enrolled in a program for one semester.
 *
 * This is the parent of the per-course enrollment records: enrolling in a term
 * enrols the student in every course of its curriculum, which is why the
 * enrollment screen can be entered from a program rather than a course.
 */
export interface ProgramEnrollment {
  id: string;
  studentId: string;
  programId: string;
  semesterCode: SemesterCode;
  status: "pending" | "active" | "completed" | "withdrawn";
  enrolledAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Profitability                                                              */
/* -------------------------------------------------------------------------- */

/** One course line in a term's cost, so the total can show its working. */
export interface ProgramCourseCost {
  courseId: string;
  courseCode: string;
  courseName: string;
  /** Cost per student on that course, from its cost sheet. Null if no sheet. */
  costPerStudent: number | null;
  /** Students from this program taking the course this term. */
  headCount: number;
  /** costPerStudent x headCount, or null when the course has no sheet. */
  attributedCost: number | null;
}

/**
 * Revenue against cost for one program term.
 *
 * Every intermediate figure is kept, for the same reason the cost breakdown
 * keeps its own: a margin the reader cannot check is a margin they cannot
 * trust.
 */
export interface ProgramProfit {
  programTermId: string;
  currency: string;
  packagePrice: number;
  enrolledCount: number;
  /** packagePrice x enrolledCount — what the price implies, before invoicing. */
  listRevenue: number;
  /** Sum of the billed invoice totals (direction.md §13b). */
  revenue: number;
  /** Invoiced and paid. */
  collected: number;
  /** Invoiced and unpaid, overdue included. */
  outstanding: number;
  /** Sum of the attributed course costs below. */
  totalCost: number;
  /**
   * collected - totalCost. Negative is a real answer, not an error.
   *
   * The basis is collected rather than revenue, per §13a: a student who has
   * been billed and has not paid is owed money, not earned money.
   */
  netProfit: number;
  /** netProfit / collected as a percentage, or null when nothing is collected. */
  marginPercent: number | null;
  /** Net profit per head, or null with nobody enrolled. */
  profitPerStudent: number | null;
  courses: ProgramCourseCost[];
  /** Courses in the curriculum with no cost sheet, so the total is incomplete. */
  coursesMissingCostSheet: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface ProgramTermSummary {
  id: string;
  programId: string;
  programCode: string;
  programName: string;
  semesterCode: SemesterCode;
  status: ProgramTermStatus;
  courseCount: number;
  enrolledCount: number;
  currency: string;
  packagePrice: number;
  /** packagePrice x enrolledCount, kept beside the invoiced figure. */
  listRevenue: number;
  /** Invoiced, per §13b. Lower than listRevenue by the credits given. */
  revenue: number;
  collected: number;
  outstanding: number;
  totalCost: number;
  /** collected - totalCost. */
  netProfit: number;
  marginPercent: number | null;
  /** Courses with no cost sheet, so the cost above is lower than the real one. */
  coursesMissingCostSheet: number;
}

export interface ProgramRosterEntry {
  enrollmentId: string;
  student: StudentSummary;
  status: ProgramEnrollment["status"];
  enrolledAt: string;
}

export interface ProgramListFilters {
  search?: string;
  status?: ProgramStatus | "all";
  semester?: SemesterCode | "all";
}
