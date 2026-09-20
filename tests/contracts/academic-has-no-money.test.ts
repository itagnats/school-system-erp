import { describe, expect, it } from "vitest";
import {
  programCostListItemSchema,
  programTermSummarySchema,
} from "@/lib/api/contracts";

/**
 * The Academic menu shows no money, and the wire is where that is enforced
 * (direction.md §13a, revised 2026-09-20, `AUD-031`).
 *
 * Deleting a column is not the same as removing a figure. `ProgramTermSummary`
 * is read by **two** screens - the Curriculum list and the Enrollment list -
 * and it carried a full P&L while only one of them ever rendered it. So money
 * was being computed and shipped to a Students-menu screen, which no amount of
 * looking at the page would have revealed.
 *
 * **Not sending a figure is the only reliable way to keep it off a screen**,
 * and a schema is the only place that can be asserted. A column can be added
 * back to a table in one line; this test is what makes doing so fail.
 */

/** Every figure that moved to Cost Management. */
const MONEY_FIELDS = [
  "listRevenue",
  "revenue",
  "collected",
  "outstanding",
  "totalCost",
  "netProfit",
  "marginPercent",
  "coursesMissingCostSheet",
] as const;

const CURRICULUM_ROW = {
  id: "pgt-bsc-it-202601",
  programId: "prg-it",
  programCode: "BSC-IT",
  programName: "BSc Information Technology",
  semesterCode: "202601",
  status: "open" as const,
  courseCount: 3,
  enrolledCount: 42,
  currency: "THB",
  packagePrice: 49200,
};

describe("the curriculum row carries no P&L", () => {
  it("parses a clean academic row", () => {
    expect(programTermSummarySchema.parse(CURRICULUM_ROW)).toEqual(CURRICULUM_ROW);
  });

  it("strips every money field a caller tries to send", () => {
    const withMoney = {
      ...CURRICULUM_ROW,
      listRevenue: 2066400,
      revenue: 1900000,
      collected: 1400000,
      outstanding: 500000,
      totalCost: 900000,
      netProfit: 500000,
      marginPercent: 35.71,
      coursesMissingCostSheet: 1,
    };

    const parsed = programTermSummarySchema.parse(withMoney);

    for (const field of MONEY_FIELDS) {
      expect(field in parsed).toBe(false);
    }
  });

  it("keeps the package price, which is a curriculum attribute", () => {
    // §4a lists the package price under Curriculum: it is part of what the
    // offer *is*, where every field above is a verdict on it. Removing this
    // one would be over-correcting the finding.
    expect(programTermSummarySchema.parse(CURRICULUM_ROW).packagePrice).toBe(49200);
    expect(
      programTermSummarySchema.safeParse({ ...CURRICULUM_ROW, packagePrice: undefined })
        .success,
    ).toBe(false);
  });

  it("is exactly the ten academic fields and nothing else", () => {
    // Pinned as a whole rather than field by field, so a *new* money field
    // added later fails here too. The eight above are the ones that left; this
    // is the assertion that catches the ninth.
    expect(Object.keys(programTermSummarySchema.parse(CURRICULUM_ROW)).sort()).toEqual([
      "courseCount",
      "currency",
      "enrolledCount",
      "id",
      "packagePrice",
      "programCode",
      "programId",
      "programName",
      "semesterCode",
      "status",
    ]);
  });
});

/**
 * The other half of the move: Cost Management has to actually carry the
 * figures, or the first half is a deletion rather than a relocation.
 *
 * Before this change a grep for these fields across `features/costs/` returned
 * nothing - profitability did not exist under Cost Management at all.
 */
const COST_ROW = {
  id: "pcs-bsc-it-202601",
  programTermId: "pgt-bsc-it-202601",
  programId: "prg-it",
  programCode: "BSC-IT",
  programName: "BSc Information Technology",
  semesterCode: "202601",
  status: "approved" as const,
  currency: "THB",
  courseCount: 3,
  studentCount: 42,
  directTotal: 180000,
  indirectTotal: 60000,
  totalCost: 248692.5,
  costPerStudent: 5921.25,
  preferredPrice: 6000,
  packagePrice: 49200,
  missingCostSheets: 0,
  updatedAt: "2026-01-05T09:00:00.000Z",
  listRevenue: 2066400,
  revenue: 1900000,
  collected: 1400000,
  outstanding: 500000,
  attributedCost: 196895.92,
  netProfit: 1203104.08,
  marginPercent: 85.94,
};

describe("the program cost row carries the P&L", () => {
  it("parses a full row", () => {
    expect(programCostListItemSchema.parse(COST_ROW)).toEqual(COST_ROW);
  });

  it("requires every figure that left the curriculum row", () => {
    for (const field of ["listRevenue", "revenue", "collected", "outstanding", "netProfit"]) {
      const without: Record<string, unknown> = { ...COST_ROW };
      delete without[field];
      expect(programCostListItemSchema.safeParse(without).success).toBe(false);
    }
  });

  it("allows a null margin, because nothing collected has no answer", () => {
    // Null is not zero: a term that has collected nothing has no margin, and
    // 0% would be a claim about a question nobody can answer yet.
    expect(
      programCostListItemSchema.parse({ ...COST_ROW, marginPercent: null }).marginPercent,
    ).toBeNull();
  });

  it("carries the attributed cost separately from the sheet total", () => {
    // The two answer different questions and diverge on 2 of the 19 seeded
    // terms. Collapsing them into one field is what would make those two rows
    // read as arithmetic that failed.
    const parsed = programCostListItemSchema.parse(COST_ROW);
    expect(parsed.totalCost).not.toBe(parsed.attributedCost);

    const without: Record<string, unknown> = { ...COST_ROW };
    delete without.attributedCost;
    expect(programCostListItemSchema.safeParse(without).success).toBe(false);
  });
});
