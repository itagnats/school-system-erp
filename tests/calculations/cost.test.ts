import { describe, expect, it } from "vitest";
import {
  calculateCostBreakdown,
  calculateCostPerStudent,
  effectiveUnitPrice,
} from "@/lib/calculations";
import type { CostItem, CostSheet } from "@/types";

function item(overrides: Partial<CostItem> = {}): CostItem {
  return {
    id: "itm-1",
    name: "Item",
    kind: "direct",
    unitPrice: 100,
    quantity: 2,
    allocationPercent: 100,
    options: [],
    ...overrides,
  };
}

function sheet(overrides: Partial<CostSheet> = {}): CostSheet {
  return {
    id: "cst-1",
    courseId: "crs-1",
    semesterCode: "202601",
    status: "draft",
    markupPercent: 0,
    studentCount: 10,
    currency: "THB",
    groups: [{ id: "grp-1", name: "Group", items: [item()] }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("effectiveUnitPrice", () => {
  it("uses the item price when no option is selected", () => {
    expect(effectiveUnitPrice(item({ unitPrice: 250 }))).toBe(250);
  });

  it("uses the selected option price when one is selected", () => {
    const withOptions = item({
      unitPrice: 250,
      selectedOptionId: "opt-b",
      options: [
        { id: "opt-a", name: "A", unitPrice: 400 },
        { id: "opt-b", name: "B", unitPrice: 900 },
      ],
    });
    expect(effectiveUnitPrice(withOptions)).toBe(900);
  });

  it("falls back to the item price when the selected option is missing", () => {
    const dangling = item({ unitPrice: 250, selectedOptionId: "opt-gone" });
    expect(effectiveUnitPrice(dangling)).toBe(250);
  });
});

describe("calculateCostBreakdown", () => {
  it("splits direct from shared and sums to the subtotal", () => {
    const result = calculateCostBreakdown(
      sheet({
        groups: [
          {
            id: "grp-1",
            name: "Group",
            items: [
              item({ id: "a", kind: "direct", unitPrice: 1000, quantity: 2 }),
              item({
                id: "b",
                kind: "shared",
                unitPrice: 1000,
                quantity: 1,
                allocationPercent: 25,
              }),
            ],
          },
        ],
      }),
    );

    expect(result.directTotal).toBe(2000);
    expect(result.sharedTotal).toBe(250);
    expect(result.subtotal).toBe(2250);
  });

  it("applies allocation to a shared item and never to a direct one", () => {
    const result = calculateCostBreakdown(
      sheet({
        groups: [
          {
            id: "grp-1",
            name: "Group",
            items: [
              item({ id: "s", kind: "shared", unitPrice: 800, quantity: 3, allocationPercent: 50 }),
            ],
          },
        ],
      }),
    );

    const only = result.groups[0].items[0];
    expect(only.gross).toBe(2400);
    expect(only.allocated).toBe(1200);
  });

  it("adds markup on top of the subtotal", () => {
    const result = calculateCostBreakdown(sheet({ markupPercent: 10 }));
    expect(result.subtotal).toBe(200);
    expect(result.markupAmount).toBe(20);
    expect(result.totalCost).toBe(220);
  });

  it("divides the total by the student count", () => {
    const result = calculateCostBreakdown(sheet({ studentCount: 8, markupPercent: 0 }));
    expect(result.totalCost).toBe(200);
    expect(result.costPerStudent).toBe(25);
  });

  it("returns null cost per student rather than zero when nobody is enrolled", () => {
    expect(calculateCostPerStudent(sheet({ studentCount: 0 }))).toBeNull();
  });

  it("gives each group its share of the total", () => {
    const result = calculateCostBreakdown(
      sheet({
        markupPercent: 0,
        groups: [
          { id: "g1", name: "One", items: [item({ unitPrice: 300, quantity: 1 })] },
          { id: "g2", name: "Two", items: [item({ unitPrice: 100, quantity: 1 })] },
        ],
      }),
    );

    expect(result.totalCost).toBe(400);
    expect(result.groups[0].sharePercent).toBe(75);
    expect(result.groups[1].sharePercent).toBe(25);
  });

  it("reports a zero share rather than dividing by zero on an empty sheet", () => {
    const result = calculateCostBreakdown(
      sheet({ groups: [{ id: "g1", name: "One", items: [] }] }),
    );
    expect(result.totalCost).toBe(0);
    expect(result.groups[0].sharePercent).toBe(0);
  });
});
