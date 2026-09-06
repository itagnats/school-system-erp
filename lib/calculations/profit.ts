import type { ProgramCourseCost, ProgramProfit } from "@/types";
import { percentOf, roundMoney } from "./number";

/**
 * Programme profitability (direction.md §13a).
 *
 *   Package price x enrolled students = Revenue
 *   Sum of attributed course costs     = Total cost
 *   Revenue - Total cost               = Net profit
 *
 * The interesting part is *attributed*. A course cost sheet covers everyone on
 * that course, and a course can be taught into several programmes at once, so a
 * programme cannot simply be charged the whole sheet. It is charged the course
 * cost per student multiplied by its own head count on that course, which is
 * the only split that stays correct when two programmes share a course.
 *
 * Three things are deliberately not hidden:
 *   - a course with no cost sheet contributes null rather than zero, and the
 *     count of those is carried on the result, because a total assembled from
 *     an incomplete curriculum is not the same claim as a complete one;
 *   - a negative net profit is returned as a negative number, not clamped;
 *   - margin is null with no revenue, because a percentage of nothing is not
 *     zero percent.
 */

export interface ProgramProfitInput {
  programTermId: string;
  currency: string;
  packagePrice: number;
  enrolledCount: number;
  courses: {
    courseId: string;
    courseCode: string;
    courseName: string;
    /** From the course cost sheet for this semester. Null when there is none. */
    costPerStudent: number | null;
    /** Students from this programme taking this course. */
    headCount: number;
  }[];
}

export function calculateProgramProfit(input: ProgramProfitInput): ProgramProfit {
  const courses: ProgramCourseCost[] = input.courses.map((course) => ({
    courseId: course.courseId,
    courseCode: course.courseCode,
    courseName: course.courseName,
    costPerStudent: course.costPerStudent,
    headCount: course.headCount,
    attributedCost:
      course.costPerStudent === null
        ? null
        : roundMoney(course.costPerStudent * course.headCount),
  }));

  const revenue = roundMoney(input.packagePrice * input.enrolledCount);
  const totalCost = roundMoney(
    courses.reduce((sum, course) => sum + (course.attributedCost ?? 0), 0),
  );
  const netProfit = roundMoney(revenue - totalCost);

  return {
    programTermId: input.programTermId,
    currency: input.currency,
    packagePrice: input.packagePrice,
    enrolledCount: input.enrolledCount,
    revenue,
    totalCost,
    netProfit,
    marginPercent: revenue > 0 ? percentOf(netProfit, revenue) : null,
    profitPerStudent:
      input.enrolledCount > 0 ? roundMoney(netProfit / input.enrolledCount) : null,
    courses,
    coursesMissingCostSheet: courses.filter((course) => course.costPerStudent === null)
      .length,
  };
}

/**
 * The package price at which a term would break even.
 *
 * Useful next to the margin: it answers "what would this have to cost" rather
 * than only "what did we make". Null when nobody is enrolled, because the
 * question has no answer then.
 */
export function breakEvenPrice(profit: ProgramProfit): number | null {
  if (profit.enrolledCount <= 0) return null;
  return roundMoney(profit.totalCost / profit.enrolledCount);
}
