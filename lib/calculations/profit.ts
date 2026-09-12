import type { InvoicedRevenue, ProgramCourseCost, ProgramProfit } from "@/types";
import { percentOf, roundMoney } from "./number";

/**
 * Programme profitability (direction.md §13a, revised 2026-09-12).
 *
 *   Package price x enrolled students = List revenue
 *   Sum of billed invoice totals       = Revenue
 *     of which paid                    = Collected
 *     of which unpaid                  = Outstanding
 *   Sum of attributed course costs     = Total cost
 *   Collected - Total cost             = Net profit
 *
 * **Revenue is invoiced, not implied.** It used to be the first line — package
 * price times head count — which counted a pending student who had never paid
 * as earned money, and could not see a credit for a course somebody dropped.
 * Both figures are kept, because the gap between them is the story.
 *
 * **Net profit is stated on a basis, and the basis is collected.** A figure
 * labelled only "net profit" over a term with a quarter of its invoices unpaid
 * makes a claim it cannot support.
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
  /**
   * What this term's invoices say, from the invoice service.
   *
   * Passed in rather than computed here: this module does arithmetic over
   * figures it is given, and reaching into an invoice table would make it
   * untestable without one.
   */
  invoiced: InvoicedRevenue;
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

  const listRevenue = roundMoney(input.packagePrice * input.enrolledCount);
  const collected = roundMoney(input.invoiced.collected);
  const totalCost = roundMoney(
    courses.reduce((sum, course) => sum + (course.attributedCost ?? 0), 0),
  );
  const netProfit = roundMoney(collected - totalCost);

  return {
    programTermId: input.programTermId,
    currency: input.currency,
    packagePrice: input.packagePrice,
    enrolledCount: input.enrolledCount,
    listRevenue,
    revenue: roundMoney(input.invoiced.revenue),
    collected,
    outstanding: roundMoney(input.invoiced.outstanding),
    totalCost,
    netProfit,
    // Against collected, not revenue: dividing by money that has not arrived
    // reports a margin on a term nobody has paid for.
    marginPercent: collected > 0 ? percentOf(netProfit, collected) : null,
    profitPerStudent:
      input.enrolledCount > 0 ? roundMoney(netProfit / input.enrolledCount) : null,
    courses,
    coursesMissingCostSheet: courses.filter((course) => course.costPerStudent === null)
      .length,
    invoiceCount: input.invoiced.invoiceCount,
    paidCount: input.invoiced.paidCount,
    overdueCount: input.invoiced.overdueCount,
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
