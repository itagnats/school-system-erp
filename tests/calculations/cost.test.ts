import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICE_ROUNDING_STEP,
  calculateCourseDirect,
  calculateGroupBreakdowns,
  calculateProgramCostBreakdown,
  calculateStandaloneCourseCost,
  copyItemId,
  copyOptionId,
  copyOrdinal,
  distribute,
  driverValue,
  effectiveUnitPrice,
  preferredPriceFor,
} from "@/lib/calculations";
import type {
  CostItem,
  CourseCostInput,
  CourseCostSheet,
  ProgramCostSheet,
} from "@/types";

function item(overrides: Partial<CostItem> = {}): CostItem {
  return {
    id: "itm-1",
    name: "Item",
    kind: "direct",
    unitPrice: 100,
    quantity: 2,
    options: [],
    ...overrides,
  };
}

function courseSheet(overrides: Partial<CourseCostSheet> = {}): CourseCostSheet {
  return {
    id: "cst-1",
    courseId: "crs-1",
    semesterCode: "202601",
    status: "draft",
    studentCount: 10,
    currency: "THB",
    groups: [{ id: "grp-1", name: "Teaching", items: [item()] }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function programSheet(overrides: Partial<ProgramCostSheet> = {}): ProgramCostSheet {
  return {
    id: "pcs-1",
    programTermId: "pgt-1",
    semesterCode: "202601",
    status: "draft",
    driver: "credits",
    markupPercent: 0,
    priceRoundingStep: DEFAULT_PRICE_ROUNDING_STEP,
    currency: "THB",
    groups: [
      {
        id: "grp-f",
        name: "Facilities",
        items: [item({ id: "itm-room", name: "Classroom", kind: "indirect", unitPrice: 1000, quantity: 12 })],
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function course(
  id: string,
  credits: number,
  direct: number,
  students = 10,
): CourseCostInput {
  return {
    courseId: id,
    courseCode: id.toUpperCase(),
    courseName: `Course ${id}`,
    credits,
    sheet: courseSheet({
      id: `cst-${id}`,
      courseId: id,
      studentCount: students,
      groups: [
        {
          id: "grp-1",
          name: "Teaching",
          items: [item({ unitPrice: direct, quantity: 1 })],
        },
      ],
    }),
  };
}

describe("effectiveUnitPrice", () => {
  it("uses the item price when no option is selected", () => {
    expect(effectiveUnitPrice(item({ unitPrice: 250 }))).toBe(250);
  });

  it("uses the selected option's price", () => {
    const withOptions = item({
      unitPrice: 400,
      options: [
        { id: "opt-a", name: "Standard", unitPrice: 400 },
        { id: "opt-b", name: "Lab", unitPrice: 950 },
      ],
      selectedOptionId: "opt-b",
    });
    expect(effectiveUnitPrice(withOptions)).toBe(950);
  });

  it("falls back to the item price when the selection names nothing", () => {
    // A dangling option id must not produce NaN on a cost sheet.
    expect(effectiveUnitPrice(item({ unitPrice: 400, selectedOptionId: "gone" }))).toBe(400);
  });
});

describe("calculateGroupBreakdowns", () => {
  it("totals each group and its share of the sheet", () => {
    const { groups, total } = calculateGroupBreakdowns([
      { id: "g1", name: "A", items: [item({ unitPrice: 300, quantity: 1 })] },
      { id: "g2", name: "B", items: [item({ unitPrice: 100, quantity: 1 })] },
    ]);

    expect(total).toBe(400);
    expect(groups.map((g) => g.sharePercent)).toEqual([75, 25]);
  });

  it("gives an empty sheet a zero total rather than NaN", () => {
    expect(calculateGroupBreakdowns([])).toEqual({ groups: [], total: 0 });
  });

  it("shares out as zero rather than dividing by a zero total", () => {
    const { groups } = calculateGroupBreakdowns([
      { id: "g1", name: "A", items: [item({ unitPrice: 0, quantity: 0 })] },
    ]);
    expect(groups[0].sharePercent).toBe(0);
  });
});

describe("distribute", () => {
  it("splits in proportion to the weights", () => {
    expect(distribute(1100, [4, 3, 2, 2])).toEqual([400, 300, 200, 200]);
  });

  it("sums to the amount EXACTLY, even when the split does not divide", () => {
    // The leak this function exists to stop: rounding each third independently
    // gives 33.33 x 3 = 99.99 and one satang disappears.
    const parts = distribute(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
  });

  it("gives the odd satang to the largest remainder, then to the earlier course", () => {
    const parts = distribute(10, [1, 1, 1]);
    expect(parts).toEqual([3.34, 3.33, 3.33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("splits evenly when every weight is zero", () => {
    // A program whose courses all carry zero credits must still be costable.
    expect(distribute(90, [0, 0, 0])).toEqual([30, 30, 30]);
  });

  it("ignores a negative or non-finite weight rather than inverting the split", () => {
    const parts = distribute(100, [1, -5, Number.NaN]);
    expect(parts).toEqual([100, 0, 0]);
  });

  it("returns nothing for no courses", () => {
    expect(distribute(500, [])).toEqual([]);
  });

  it("distributes nothing when there is nothing to distribute", () => {
    expect(distribute(0, [3, 2])).toEqual([0, 0]);
  });

  it("is deterministic — the same split every time", () => {
    expect(distribute(1000, [2, 3, 3])).toEqual(distribute(1000, [2, 3, 3]));
  });
});

describe("driverValue", () => {
  it("reads credits", () => {
    expect(driverValue("credits", { credits: 3 })).toBe(3);
  });
});

describe("calculateCourseDirect", () => {
  it("totals only what is on the course sheet", () => {
    const { directTotal } = calculateCourseDirect(courseSheet());
    expect(directTotal).toBe(200);
  });
});

describe("calculateProgramCostBreakdown", () => {
  const courses = [course("a", 4, 40000), course("b", 3, 30000), course("c", 2, 20000)];

  it("distributes the indirect pool by credits", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses,
      studentCount: 25,
    });

    // Pool is 1000 x 12 = 12,000 across credits 4 / 3 / 2 of 9.
    expect(result.indirectTotal).toBe(12000);
    // 12,000 x 4/9 and x 2/9 both recur; the odd satang goes to the largest
    // remainder, which is course c at .667 rather than course a at .333.
    expect(result.courses.map((c) => c.indirectShare)).toEqual([
      5333.33, 4000, 2666.67,
    ]);
    expect(result.courses.map((c) => c.sharePercent)).toEqual([44.44, 33.33, 22.22]);
  });

  it("gives the courses shares that sum to the pool exactly", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses,
      studentCount: 25,
    });
    const summed = result.courses.reduce((sum, c) => sum + c.indirectShare, 0);
    expect(Math.round(summed * 100) / 100).toBe(result.indirectTotal);
  });

  it("reconciles: the course totals sum to the program total", () => {
    // The invariant that makes the two levels one costing rather than two.
    const result = calculateProgramCostBreakdown({
      sheet: programSheet({ markupPercent: 8 }),
      courses,
      studentCount: 25,
    });
    const summed = result.courses.reduce((sum, c) => sum + c.totalCost, 0);
    expect(Math.round(summed * 100) / 100).toBe(result.totalCost);
    expect(result.subtotal).toBe(result.directTotal + result.indirectTotal);
  });

  it("applies one program markup to each course's subtotal", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet({ markupPercent: 10 }),
      courses,
      studentCount: 25,
    });
    const first = result.courses[0];
    expect(first.subtotal).toBe(45333.33);
    expect(first.markupAmount).toBe(4533.33);
    expect(first.totalCost).toBe(49866.66);
  });

  it("reports both per-student figures on their own bases", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses,
      studentCount: 25,
    });

    // Program: the whole cost over the program roster.
    expect(result.costPerStudent).toBe(roundTo(result.totalCost / 25));
    // Course: that course's own total over its own head count.
    expect(result.courses[0].costPerStudent).toBe(
      roundTo(result.courses[0].totalCost / 10),
    );
  });

  it("prices the program by rounding its cost per student up", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses,
      studentCount: 25,
    });
    expect(result.costPerStudent).toBe(4080);
    expect(result.preferredPrice).toBe(5000);
    expect(result.roundingGain).toBe(920);
  });

  it("names a curriculum course with no sheet instead of costing it as zero", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses: [
        courses[0],
        { courseId: "d", courseCode: "D", courseName: "Course d", credits: 2 },
      ],
      studentCount: 20,
    });

    expect(result.coursesMissingCostSheet).toEqual(["d"]);
    // It still takes its share of the pool - it is in the curriculum, and the
    // room was booked for it.
    expect(result.courses[1].indirectShare).toBeGreaterThan(0);
    expect(result.courses[1].directTotal).toBe(0);
  });

  it("has no price and no per-student cost when nobody is enrolled", () => {
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses,
      studentCount: 0,
    });
    expect(result.costPerStudent).toBeNull();
    expect(result.preferredPrice).toBeNull();
    expect(result.roundingGain).toBeNull();
  });

  it("still states the split when the pool is empty", () => {
    // A term that has booked no rooms yet should say how it *would* share them.
    const result = calculateProgramCostBreakdown({
      sheet: programSheet({ groups: [] }),
      courses,
      studentCount: 25,
    });
    expect(result.indirectTotal).toBe(0);
    expect(result.courses.map((c) => c.sharePercent)).toEqual([44.44, 33.33, 22.22]);
    expect(result.courses.map((c) => c.indirectShare)).toEqual([0, 0, 0]);
  });

  it("splits evenly when every course carries the same credits", () => {
    const even = [course("a", 3, 0), course("b", 3, 0)];
    const result = calculateProgramCostBreakdown({
      sheet: programSheet(),
      courses: even,
      studentCount: 10,
    });
    expect(result.courses.map((c) => c.indirectShare)).toEqual([6000, 6000]);
  });
});

describe("calculateStandaloneCourseCost", () => {
  it("bears no indirect share and no markup", () => {
    const result = calculateStandaloneCourseCost(course("a", 4, 40000));

    expect(result.directTotal).toBe(40000);
    expect(result.indirectShare).toBe(0);
    expect(result.markupAmount).toBe(0);
    expect(result.totalCost).toBe(40000);
    expect(result.costPerStudent).toBe(4000);
  });

  it("has a null share, not a zero one", () => {
    // "No program to take a share of" is not "a 0% share of one".
    expect(calculateStandaloneCourseCost(course("a", 4, 1)).sharePercent).toBeNull();
  });

  it("costs a course with no sheet at all as zero direct and no per-student", () => {
    const result = calculateStandaloneCourseCost({
      courseId: "x",
      courseCode: "X",
      courseName: "Course x",
      credits: 3,
    });
    expect(result.directTotal).toBe(0);
    expect(result.costPerStudent).toBeNull();
  });
});

describe("preferredPriceFor", () => {
  it("rounds a real cost up to a sellable price", () => {
    // The figure that prompted this: a course costing 4,988 is not sold at
    // 4,988 (direction.md 13).
    expect(preferredPriceFor(4988, 1000)).toBe(5000);
    expect(preferredPriceFor(5988, 1000)).toBe(6000);
  });

  it("always rounds up, never to nearest", () => {
    // 4,201 is nearer 4,000, and 4,000 would price below cost.
    expect(preferredPriceFor(4201.11, 1000)).toBe(5000);
    expect(preferredPriceFor(10859.55, 1000)).toBe(11000);
  });

  it("leaves a cost already on the step alone", () => {
    expect(preferredPriceFor(5000, 1000)).toBe(5000);
    expect(preferredPriceFor(486.13, 500)).toBe(500);
  });

  it("honors the sheet's own step", () => {
    expect(preferredPriceFor(4201.11, 500)).toBe(4500);
    expect(preferredPriceFor(4201.11, 100)).toBe(4300);
  });

  it("defaults to the thousand the seed uses", () => {
    expect(DEFAULT_PRICE_ROUNDING_STEP).toBe(1000);
    expect(preferredPriceFor(4988)).toBe(5000);
  });

  it("treats a step of 1 as rounding to the baht", () => {
    expect(preferredPriceFor(4201.11, 1)).toBe(4202);
  });

  it("stays total on a step the schema would refuse", () => {
    expect(preferredPriceFor(4201.11, 0)).toBe(4202);
  });

  it("is null when there is no cost per student", () => {
    expect(preferredPriceFor(null, 1000)).toBeNull();
  });

  it("never prices below cost, across the seeded range", () => {
    for (const cost of [486.13, 1007.78, 4201.11, 4988, 5000, 10859.55]) {
      const price = preferredPriceFor(cost, 1000);
      expect(price).not.toBeNull();
      expect(price ?? 0).toBeGreaterThanOrEqual(cost);
    }
  });
});

function roundTo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * `AUD-013`. The copy's id used to be `itm-<source>-<WRITE_STAMP>`, and
 * `WRITE_STAMP` is a frozen constant - so two copies of one catalog item on
 * one sheet were the same row twice. §12a says two of them is the supported
 * case, which is what made it a bug rather than a curiosity.
 */
describe("identifying a copy of a catalog item", () => {
  it("gives the first copy a plain id", () => {
    expect(copyItemId("cat-lecturer", 1)).toBe("itm-cat-lecturer");
  });

  it("numbers the ones after it", () => {
    expect(copyItemId("cat-lecturer", 2)).toBe("itm-cat-lecturer-2");
    expect(copyItemId("cat-lecturer", 3)).toBe("itm-cat-lecturer-3");
  });

  it("starts at one on an empty sheet", () => {
    expect(copyOrdinal("cat-lecturer", [])).toBe(1);
  });

  it("steps past a copy the sheet already holds", () => {
    expect(copyOrdinal("cat-lecturer", ["itm-cat-lecturer"])).toBe(2);
    expect(copyOrdinal("cat-lecturer", ["itm-cat-lecturer", "itm-cat-lecturer-2"])).toBe(3);
  });

  it("ignores ids belonging to other items", () => {
    // Two lecturers and one classroom on a sheet: the classroom must not push
    // the lecturer's numbering along, or the ids stop being readable.
    expect(copyOrdinal("cat-lecturer", ["itm-cat-room", "itm-cat-room-2"])).toBe(1);
  });

  it("fills a gap left by a removed line", () => {
    // Deleting the first of two leaves `-2` behind. Reusing 1 is right: the
    // ordinal is a discriminator among the ids present, not a running count of
    // everything this sheet has ever held.
    expect(copyOrdinal("cat-lecturer", ["itm-cat-lecturer-2"])).toBe(1);
  });

  it("is deterministic - the same sheet gives the same id twice", () => {
    // The property the frozen timestamp had and the reason it was chosen. It
    // has to survive the fix, or the server and client renders disagree.
    const taken = ["itm-cat-lecturer"];
    expect(copyItemId("cat-lecturer", copyOrdinal("cat-lecturer", taken))).toBe(
      copyItemId("cat-lecturer", copyOrdinal("cat-lecturer", taken)),
    );
  });

  it("carries the same ordinal into the options", () => {
    // Otherwise the second copy's `selectedOptionId` names an option on the
    // first, and changing one line's choice changes the other's.
    expect(copyOptionId("opt-senior", 1)).toBe("opt-senior");
    expect(copyOptionId("opt-senior", 2)).toBe("opt-senior-2");
  });
});
