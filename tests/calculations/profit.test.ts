import { describe, expect, it } from "vitest";
import { breakEvenPrice, calculateProgramProfit } from "@/lib/calculations";
import type { ProgramProfitInput } from "@/lib/calculations/profit";
import type { InvoicedRevenue } from "@/types";

/**
 * Fully invoiced and fully paid, unless a test says otherwise.
 *
 * Most of these cases are about cost attribution, and defaulting collection to
 * "everyone paid" keeps them reading as they did before invoices existed. The
 * cases that are about collection override it explicitly.
 */
function invoiced(overrides: Partial<InvoicedRevenue> = {}): InvoicedRevenue {
  const revenue = overrides.revenue ?? 200000;
  return {
    revenue,
    collected: revenue,
    outstanding: 0,
    invoiceCount: 20,
    paidCount: 20,
    overdueCount: 0,
    ...overrides,
  };
}

function input(overrides: Partial<ProgramProfitInput> = {}): ProgramProfitInput {
  return {
    programTermId: "pgt-1",
    currency: "THB",
    packagePrice: 10000,
    enrolledCount: 20,
    invoiced: invoiced(),
    courses: [
      {
        courseId: "crs-1",
        courseCode: "IT101",
        courseName: "Intro",
        costPerStudent: 3000,
        headCount: 20,
      },
    ],
    ...overrides,
  };
}

describe("calculateProgramProfit", () => {
  it("keeps list revenue as the package price times the head count", () => {
    const result = calculateProgramProfit(input({ packagePrice: 12500, enrolledCount: 8 }));
    expect(result.listRevenue).toBe(100000);
  });

  it("takes revenue from the invoices, not from the package price", () => {
    // The gap is what a credit for a dropped course looks like from up here.
    const result = calculateProgramProfit(
      input({ invoiced: invoiced({ revenue: 182000, collected: 182000 }) }),
    );

    expect(result.listRevenue).toBe(200000);
    expect(result.revenue).toBe(182000);
  });

  it("attributes course cost per student, not the whole sheet", () => {
    const result = calculateProgramProfit(
      input({
        courses: [
          {
            courseId: "crs-1",
            courseCode: "IT101",
            courseName: "Intro",
            costPerStudent: 3000,
            // Only 5 of this programme's students take the course, even though
            // the sheet covers everyone on it.
            headCount: 5,
          },
        ],
      }),
    );

    expect(result.courses[0].attributedCost).toBe(15000);
    expect(result.totalCost).toBe(15000);
  });

  it("subtracts cost from what was collected", () => {
    const result = calculateProgramProfit(input());
    expect(result.collected).toBe(200000);
    expect(result.totalCost).toBe(60000);
    expect(result.netProfit).toBe(140000);
  });

  it("does not count outstanding invoices as profit", () => {
    // The defect this rule replaced: a pending student who had been billed and
    // had not paid used to arrive as earned revenue.
    const result = calculateProgramProfit(
      input({
        invoiced: invoiced({
          revenue: 200000,
          collected: 50000,
          outstanding: 150000,
          paidCount: 5,
        }),
      }),
    );

    expect(result.revenue).toBe(200000);
    expect(result.collected).toBe(50000);
    expect(result.outstanding).toBe(150000);
    expect(result.netProfit).toBe(-10000);
  });

  it("returns a loss as a negative number rather than clamping it", () => {
    const result = calculateProgramProfit(
      input({
        packagePrice: 1000,
        enrolledCount: 10,
        invoiced: invoiced({ revenue: 10000, collected: 10000, invoiceCount: 10, paidCount: 10 }),
        courses: [
          {
            courseId: "crs-1",
            courseCode: "IT101",
            courseName: "Intro",
            costPerStudent: 4000,
            headCount: 10,
          },
        ],
      }),
    );

    expect(result.collected).toBe(10000);
    expect(result.totalCost).toBe(40000);
    expect(result.netProfit).toBe(-30000);
    expect(result.marginPercent).toBe(-300);
  });

  it("treats a course with no cost sheet as unknown, not free", () => {
    const result = calculateProgramProfit(
      input({
        courses: [
          {
            courseId: "crs-1",
            courseCode: "IT101",
            courseName: "Intro",
            costPerStudent: 3000,
            headCount: 10,
          },
          {
            courseId: "crs-2",
            courseCode: "IT205",
            courseName: "Databases",
            costPerStudent: null,
            headCount: 10,
          },
        ],
      }),
    );

    expect(result.courses[1].attributedCost).toBeNull();
    expect(result.coursesMissingCostSheet).toBe(1);
    // The known cost still totals, but the caller can see it is incomplete.
    expect(result.totalCost).toBe(30000);
  });

  it("returns a null margin rather than zero when nothing is collected", () => {
    const result = calculateProgramProfit(
      input({
        invoiced: invoiced({ revenue: 0, collected: 0, invoiceCount: 0, paidCount: 0 }),
      }),
    );

    expect(result.collected).toBe(0);
    expect(result.marginPercent).toBeNull();
  });

  it("has no profit per student with nobody enrolled", () => {
    const result = calculateProgramProfit(input({ enrolledCount: 0 }));
    expect(result.listRevenue).toBe(0);
    expect(result.profitPerStudent).toBeNull();
  });

  it("reports profit per student", () => {
    const result = calculateProgramProfit(input());
    expect(result.profitPerStudent).toBe(7000);
  });

  it("carries the invoice counts through for the screen to explain itself", () => {
    const result = calculateProgramProfit(
      input({ invoiced: invoiced({ invoiceCount: 18, paidCount: 12, overdueCount: 3 }) }),
    );

    expect(result.invoiceCount).toBe(18);
    expect(result.paidCount).toBe(12);
    expect(result.overdueCount).toBe(3);
  });
});

describe("breakEvenPrice", () => {
  it("is the cost divided by the head count", () => {
    expect(breakEvenPrice(calculateProgramProfit(input()))).toBe(3000);
  });

  it("has no answer with nobody enrolled", () => {
    expect(breakEvenPrice(calculateProgramProfit(input({ enrolledCount: 0 })))).toBeNull();
  });
});
