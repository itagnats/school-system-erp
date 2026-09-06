import { describe, expect, it } from "vitest";
import { breakEvenPrice, calculateProgramProfit } from "@/lib/calculations";
import type { ProgramProfitInput } from "@/lib/calculations/profit";

function input(overrides: Partial<ProgramProfitInput> = {}): ProgramProfitInput {
  return {
    programTermId: "pgt-1",
    currency: "THB",
    packagePrice: 10000,
    enrolledCount: 20,
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
  it("multiplies the package price by the head count for revenue", () => {
    const result = calculateProgramProfit(input({ packagePrice: 12500, enrolledCount: 8 }));
    expect(result.revenue).toBe(100000);
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

  it("subtracts cost from revenue", () => {
    const result = calculateProgramProfit(input());
    expect(result.revenue).toBe(200000);
    expect(result.totalCost).toBe(60000);
    expect(result.netProfit).toBe(140000);
  });

  it("returns a loss as a negative number rather than clamping it", () => {
    const result = calculateProgramProfit(
      input({
        packagePrice: 1000,
        enrolledCount: 10,
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

    expect(result.revenue).toBe(10000);
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

  it("returns a null margin rather than zero when there is no revenue", () => {
    const result = calculateProgramProfit(input({ enrolledCount: 0 }));
    expect(result.revenue).toBe(0);
    expect(result.marginPercent).toBeNull();
    expect(result.profitPerStudent).toBeNull();
  });

  it("reports profit per student", () => {
    const result = calculateProgramProfit(input());
    expect(result.profitPerStudent).toBe(7000);
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
