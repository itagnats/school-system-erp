import type {
  CostDriver,
  CourseCostInput,
  CostGroup,
  CostGroupBreakdown,
  CostItem,
  CostItemBreakdown,
  CourseCostBreakdown,
  CourseCostSheet,
  ProgramCostBreakdown,
  ProgramCostSheet,
} from "@/types";
import { percentOf, roundMoney } from "./number";

/**
 * Cost calculation (direction.md §13, revised 2026-09-15).
 *
 *   per course       Direct costs                      (its own sheet)
 *   per prog. term   Indirect costs                    (its own sheet)
 *                    distributed by the driver         (shares total 100%)
 *   per course       Direct + Share = Subtotal
 *                    + markup       = Total Course Cost
 *                    / its students = Cost per Student
 *   per prog. term   Σ Total Course Cost               = Total Programme Cost
 *                    / programme enrolment             = Cost per Student
 *
 * Every intermediate figure is kept rather than collapsed into a total, because
 * the UI is required to show the arithmetic instead of hiding the business
 * logic. A screen that renders only `costPerStudent` cannot explain itself.
 *
 * The rule that matters most: **an indirect share is derived, never entered.**
 * It used to be a percentage typed onto each course, and percentages typed in
 * several places do not add to 100 — measured across the seed, 82 of 92
 * programme pools recovered less than the cost and 7 recovered more. A derived
 * share cannot do that.
 */

/**
 * What a preferred price rounds up to when a sheet does not say otherwise.
 *
 * A thousand baht, because a package is sold at 5,000 or 6,000 and never at
 * 4,988 — a cost is a measurement and a price is an offer, and the two are not
 * the same kind of number.
 */
export const DEFAULT_PRICE_ROUNDING_STEP = 1000;

/**
 * The sellable price for a given cost per student (direction.md §13).
 *
 * **Always up, never to nearest.** Rounding a 4,988 cost down to 4,000 would
 * price a course below what it costs to run, which is the one outcome this
 * figure exists to prevent. The uplift is reported beside it rather than folded
 * in, because it is margin the rounding created and not margin anyone chose.
 *
 * Null in, null out: no students means no cost per student, and a preferred
 * price derived from nothing would be an invented number.
 */
export function preferredPriceFor(
  costPerStudent: number | null,
  step: number = DEFAULT_PRICE_ROUNDING_STEP,
): number | null {
  if (costPerStudent === null) return null;
  // A step below 1 is not a rounding instruction, it is a division by nearly
  // zero. Treated as "to the nearest baht" rather than rejected, because the
  // schema already refuses it and this must still be total.
  const safeStep = step >= 1 ? step : 1;
  return roundMoney(Math.ceil(roundMoney(costPerStudent) / safeStep) * safeStep);
}

/** The price actually used for an item: the selected option, or the item. */
export function effectiveUnitPrice(item: CostItem): number {
  if (!item.selectedOptionId) return item.unitPrice;
  const option = item.options.find((o) => o.id === item.selectedOptionId);
  return option ? option.unitPrice : item.unitPrice;
}

export function calculateItemBreakdown(item: CostItem): CostItemBreakdown {
  return {
    itemId: item.id,
    itemName: item.name,
    kind: item.kind,
    unitPrice: effectiveUnitPrice(item),
    quantity: item.quantity,
    total: roundMoney(effectiveUnitPrice(item) * item.quantity),
  };
}

/**
 * Group totals for one sheet, with each group's share of it.
 *
 * `sharePercent` is a share of the sheet the groups are on — of the course's
 * direct costs, or of the programme's indirect pool — never of some combined
 * figure that exists on neither sheet.
 */
export function calculateGroupBreakdowns(
  groups: readonly CostGroup[],
): { groups: CostGroupBreakdown[]; total: number } {
  const computed = groups.map((group) => {
    const items = group.items.map(calculateItemBreakdown);
    return {
      groupId: group.id,
      groupName: group.name,
      total: roundMoney(items.reduce((sum, i) => sum + i.total, 0)),
      sharePercent: 0,
      items,
    };
  });

  const total = roundMoney(computed.reduce((sum, g) => sum + g.total, 0));
  for (const group of computed) {
    group.sharePercent = total > 0 ? percentOf(group.total, total) : 0;
  }

  return { groups: computed, total };
}

/**
 * Split `amount` in the given proportions so the parts sum to it **exactly**.
 *
 * Largest remainder, to two decimals. Rounding each part independently is the
 * obvious implementation and it leaks: three courses splitting 100.00 by equal
 * thirds each round to 33.33 and 0.01 disappears. One satang per programme per
 * term is not a material sum, but a cost that leaks is precisely the failure
 * this revision exists to remove, and "it is only a rounding error" is how the
 * old allocation percentages were defended too.
 *
 * Weights need not be normalised and need not be whole. All-zero weights, or an
 * empty list, return an even split — there is no proportion to honour, and
 * refusing would mean a programme whose courses all carry zero credits could
 * not be costed at all.
 */
export function distribute(amount: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];

  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safe.reduce((sum, w) => sum + w, 0);
  const shares = totalWeight > 0 ? safe : safe.map(() => 1);
  const denominator = totalWeight > 0 ? totalWeight : shares.length;

  // Work in satang so the remainder arithmetic is on whole numbers.
  const totalSatang = Math.round(roundMoney(amount) * 100);
  const exact = shares.map((w) => (totalSatang * w) / denominator);
  const floors = exact.map(Math.floor);

  let remaining = totalSatang - floors.reduce((sum, f) => sum + f, 0);
  // Biggest fractional part first; ties go to the earlier course, so the same
  // curriculum always splits the same way.
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floors];
  for (const { index } of order) {
    if (remaining <= 0) break;
    result[index] += 1;
    remaining -= 1;
  }

  return result.map((satang) => roundMoney(satang / 100));
}

/**
 * The driver value for one course. Credits today; see `CostDriver`.
 *
 * A `Record` keyed by the union rather than a switch: adding a driver to the
 * type then fails to compile until this map has an entry for it, which is the
 * exhaustiveness a one-case switch was buying and a lint rule objects to.
 */
const DRIVER_VALUE: Record<
  CostDriver,
  (course: Readonly<{ credits: number }>) => number
> = {
  credits: (course) => course.credits,
};

export function driverValue(
  driver: CostDriver,
  course: Readonly<{ credits: number }>,
): number {
  return DRIVER_VALUE[driver](course);
}

/** Direct costs for one course sheet, with its groups. */
export function calculateCourseDirect(sheet: CourseCostSheet): {
  groups: CostGroupBreakdown[];
  directTotal: number;
} {
  const { groups, total } = calculateGroupBreakdowns(sheet.groups);
  return { groups, directTotal: total };
}

/**
 * A course costed on its own, outside any programme (direction.md §11).
 *
 * Seven of the fifty-seven course-semesters are in this position. They bear no
 * indirect share and no markup, because both belong to a programme term they
 * are not in. `sharePercent` is null rather than zero: there is no pool to take
 * a share of, which is a different claim from taking none of one.
 */
export function calculateStandaloneCourseCost(
  input: CourseCostInput,
): CourseCostBreakdown {
  const direct = input.sheet
    ? calculateCourseDirect(input.sheet)
    : { groups: [], directTotal: 0 };
  const studentCount = input.sheet?.studentCount ?? 0;

  return {
    courseId: input.courseId,
    courseCode: input.courseCode,
    courseName: input.courseName,
    credits: input.credits,
    sharePercent: null,
    directTotal: direct.directTotal,
    indirectShare: 0,
    subtotal: direct.directTotal,
    markupAmount: 0,
    totalCost: direct.directTotal,
    studentCount,
    costPerStudent:
      studentCount > 0 ? roundMoney(direct.directTotal / studentCount) : null,
    groups: direct.groups,
  };
}

/**
 * A whole programme term's costing (direction.md §13).
 *
 * The indirect pool is distributed across the curriculum by the driver, the
 * markup is applied to each course's subtotal afterwards, and the programme
 * total is the sum of the course totals — which is what makes the two levels
 * reconcile rather than merely agree approximately.
 */
export function calculateProgramCostBreakdown({
  sheet,
  courses,
  studentCount,
}: Readonly<{
  sheet: ProgramCostSheet;
  /** In curriculum order. */
  courses: readonly CourseCostInput[];
  /** Enrolment on the programme term. */
  studentCount: number;
}>): ProgramCostBreakdown {
  const indirect = calculateGroupBreakdowns(sheet.groups);

  const weights = courses.map((course) => driverValue(sheet.driver, course));
  const shares = distribute(indirect.total, weights);
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);

  const breakdowns: CourseCostBreakdown[] = courses.map((course, index) => {
    const direct = course.sheet
      ? calculateCourseDirect(course.sheet)
      : { groups: [], directTotal: 0 };
    const indirectShare = shares[index] ?? 0;
    const subtotal = roundMoney(direct.directTotal + indirectShare);
    const markupAmount = roundMoney((subtotal * sheet.markupPercent) / 100);
    const totalCost = roundMoney(subtotal + markupAmount);
    const students = course.sheet?.studentCount ?? 0;

    return {
      courseId: course.courseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      credits: course.credits,
      // The share of the pool, reported from the driver rather than from the
      // money, so a pool of zero still says how it would have been split.
      sharePercent:
        weightTotal > 0
          ? percentOf(weights[index], weightTotal)
          : percentOf(1, Math.max(courses.length, 1)),
      directTotal: direct.directTotal,
      indirectShare,
      subtotal,
      markupAmount,
      totalCost,
      studentCount: students,
      costPerStudent: students > 0 ? roundMoney(totalCost / students) : null,
      groups: direct.groups,
    };
  });

  const directTotal = roundMoney(
    breakdowns.reduce((sum, c) => sum + c.directTotal, 0),
  );
  const subtotal = roundMoney(directTotal + indirect.total);
  // Summed from the courses rather than recomputed, so the programme total and
  // the course totals cannot disagree by a rounding step.
  const markupAmount = roundMoney(
    breakdowns.reduce((sum, c) => sum + c.markupAmount, 0),
  );
  const totalCost = roundMoney(
    breakdowns.reduce((sum, c) => sum + c.totalCost, 0),
  );
  const costPerStudent =
    studentCount > 0 ? roundMoney(totalCost / studentCount) : null;
  const preferredPrice = preferredPriceFor(costPerStudent, sheet.priceRoundingStep);

  return {
    programTermId: sheet.programTermId,
    driver: sheet.driver,
    directTotal,
    indirectTotal: indirect.total,
    subtotal,
    markupPercent: sheet.markupPercent,
    markupAmount,
    totalCost,
    studentCount,
    costPerStudent,
    priceRoundingStep: sheet.priceRoundingStep,
    preferredPrice,
    roundingGain:
      costPerStudent === null || preferredPrice === null
        ? null
        : roundMoney(preferredPrice - costPerStudent),
    indirectGroups: indirect.groups,
    courses: breakdowns,
    coursesMissingCostSheet: courses
      .filter((course) => !course.sheet)
      .map((course) => course.courseId),
  };
}

/** Direct cost only, for a list row that has no room for the working. */
export function calculateDirectTotal(sheet: CourseCostSheet): number {
  return calculateCourseDirect(sheet).directTotal;
}

/* -------------------------------------------------------------------------- */
/* Identifying a copy (direction.md §12a, AUD-013)                            */
/* -------------------------------------------------------------------------- */

/**
 * Which copy of a catalogue item this is, on a sheet that already holds these
 * ids. 1 for the first, 2 for the second, and so on.
 *
 * §12a says adding the same catalogue item twice is deliberate - two lecturers
 * on one course are two lines, because they may sit at different rates. The
 * two lines therefore need different ids, and the id used to be built from
 * `WRITE_STAMP`, a frozen constant standing in for a clock. Every copy of one
 * source came out identical, so `updateSheetItem` edited both and
 * `removeSheetItem` deleted both, and React keyed them the same.
 *
 * The ordinal is the discriminator that replaces it: **deterministic**, because
 * it is a function of what is already on the sheet rather than of the time, and
 * **unique**, because it is chosen to be. Both properties are required and the
 * previous id had only the first.
 *
 * It lives here rather than in the service because everything under `server/`
 * imports `server-only` and is unreachable from the test harness.
 */
export function copyOrdinal(
  catalogueItemId: string,
  taken: Iterable<string>,
): number {
  const used = new Set(taken);
  let ordinal = 1;
  while (used.has(copyItemId(catalogueItemId, ordinal))) ordinal += 1;
  return ordinal;
}

/**
 * The sheet's id for its nth copy of a catalogue item.
 *
 * The first copy carries no ordinal, so the common case - one line per item -
 * reads as `itm-cat-lecturer` rather than `itm-cat-lecturer-1`.
 */
export function copyItemId(catalogueItemId: string, ordinal: number): string {
  return ordinal <= 1 ? `itm-${catalogueItemId}` : `itm-${catalogueItemId}-${ordinal}`;
}

/**
 * The same ordinal applied to an option inside the copy.
 *
 * Two copies of an item with options would otherwise share their option ids
 * too, and `selectedOptionId` on one line would name an option on the other.
 * One ordinal for the whole copy keeps the item and its options consistent -
 * the seed does the same thing with a per-sheet suffix.
 */
export function copyOptionId(optionId: string, ordinal: number): string {
  return ordinal <= 1 ? optionId : `${optionId}-${ordinal}`;
}
