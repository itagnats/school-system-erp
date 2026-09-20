import "server-only";

import {
  calculateCourseDirect,
  calculateProgramCostBreakdown,
  calculateStandaloneCourseCost,
} from "@/lib/calculations";
import {
  courseCostSheetTable,
  courseTable,
  programTable,
  programCostSheetTable,
  programEnrollmentTable,
  programTermTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import {
  copyCatalogItem,
  findCatalogItem,
  getCatalogGroup,
} from "./catalog-service";
import type {
  CostSheetUpdateInput,
  ProgramCostSheetUpdateInput,
  SheetGroupAddInput,
  SheetItemAddInput,
  SheetItemUpdateInput,
} from "@/lib/api/contracts";
import type {
  CatalogComparison,
  CostGroup,
  CostItem,
  CostKind,
  CourseCostBreakdown,
  CourseCostInput,
  CourseCostSheet,
  PaginatedResult,
  ProgramCostBreakdown,
  ProgramCostSheet,
  ProgramTerm,
} from "@/types";

/**
 * Cost sheet reads and writes (direction.md §11-13, revised 2026-09-15).
 *
 * Two sheets, and the join between them is this module's real job: a course
 * bears its direct costs, a program term bears its indirect ones, and a
 * course's total is its direct costs plus a derived share of its program's
 * pool. Neither sheet can be read usefully without the other, so both details
 * carry the whole picture rather than half of it.
 *
 * A list row carries the derived totals rather than the nested groups. A table
 * needs the total and the per-student figure; sending four levels of nesting so
 * the browser can add them up would move business math into the client, which
 * is exactly what the calculation layer exists to prevent.
 */

/* -------------------------------------------------------------------------- */
/* The join                                                                   */
/* -------------------------------------------------------------------------- */

/** Students on a program term, active or completed but not withdrawn. */
function termHeadCount(term: ProgramTerm): number {
  return new Set(
    programEnrollmentTable
      .filter(
        (enrollment) =>
          enrollment.programId === term.programId &&
          enrollment.semesterCode === term.semesterCode &&
          enrollment.status !== "withdrawn",
      )
      .map((enrollment) => enrollment.studentId),
  ).size;
}

function courseInputsFor(term: ProgramTerm): CourseCostInput[] {
  const coursesById = new Map(courseTable.map((course) => [course.id, course]));

  return term.courseIds.map((courseId) => {
    const course = coursesById.get(courseId);
    return {
      courseId,
      courseCode: course?.code ?? courseId,
      courseName: course?.name ?? "Unknown course",
      credits: course?.credits ?? 0,
      sheet: courseCostSheetTable.find(
        (sheet) =>
          sheet.courseId === courseId && sheet.semesterCode === term.semesterCode,
      ),
    };
  });
}

/**
 * The full costing for one program term, or undefined if it has no sheet.
 *
 * Every figure on both screens comes from here, which is what stops a course's
 * share and its program's pool being computed two different ways.
 */
export function programCostBreakdownFor(
  term: ProgramTerm,
  override?: ProgramCostSheet,
): ProgramCostBreakdown | undefined {
  const sheet =
    override ?? programCostSheetTable.find((entry) => entry.programTermId === term.id);
  if (!sheet) return undefined;

  return calculateProgramCostBreakdown({
    sheet,
    courses: courseInputsFor(term),
    studentCount: termHeadCount(term),
  });
}

/** The program term a course-semester belongs to, if any. */
function termForCourse(
  courseId: string,
  semesterCode: string,
): ProgramTerm | undefined {
  return programTermTable.find(
    (term) =>
      term.semesterCode === semesterCode && term.courseIds.includes(courseId),
  );
}

/**
 * One course's costing, through its program when it has one.
 *
 * Seven of the fifty-seven course-semesters belong to no program term. They
 * fall back to a standalone costing rather than being refused: a course costed
 * outside a curriculum is a real thing, and its direct costs are still its own.
 */
function courseBreakdownFor(sheet: CourseCostSheet): CourseCostBreakdown {
  const term = termForCourse(sheet.courseId, sheet.semesterCode);
  const program = term ? programCostBreakdownFor(term) : undefined;
  const fromProgram = program?.courses.find(
    (course) => course.courseId === sheet.courseId,
  );
  if (fromProgram) return fromProgram;

  const course = courseTable.find((entry) => entry.id === sheet.courseId);
  return calculateStandaloneCourseCost({
    courseId: sheet.courseId,
    courseCode: course?.code ?? sheet.courseId,
    courseName: course?.name ?? "Unknown course",
    credits: course?.credits ?? 0,
    sheet,
  });
}

/* -------------------------------------------------------------------------- */
/* Course cost sheets                                                         */
/* -------------------------------------------------------------------------- */

export interface CostQuery extends ListQueryInput {
  courseId?: string;
  semester?: string;
  status?: string;
}

export interface CostSheetListItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  status: CourseCostSheet["status"];
  currency: string;
  studentCount: number;
  directTotal: number;
  /** Share of its program's indirect pool. Zero when it has no program. */
  indirectShare: number;
  totalCost: number;
  costPerStudent: number | null;
  /** Null when the course belongs to no program term. */
  programTermId: string | null;
  updatedAt: string;
}

export interface CourseCostSheetDetail {
  sheet: CourseCostSheet;
  courseCode: string;
  courseName: string;
  breakdown: CourseCostBreakdown;
  /** The program term this course is costed inside, if any. */
  programTermId: string | null;
  /** The program's pool and markup, so the share can be explained on screen. */
  programCostSheetId: string | null;
  indirectTotal: number;
  markupPercent: number;
  /**
   * How each item now compares with the catalog entry it was copied from.
   *
   * Travels with the sheet rather than sitting on its own endpoint: a sheet is
   * never read without wanting to know which of its rates have been overtaken,
   * and a second request for it would be a second chance to be out of step.
   */
  drift: CatalogComparison[];
}

const SORTABLE: Record<string, (row: CostSheetListItem) => string | number> = {
  courseCode: (s) => s.courseCode,
  semesterCode: (s) => s.semesterCode,
  status: (s) => s.status,
  studentCount: (s) => s.studentCount,
  directTotal: (s) => s.directTotal,
  indirectShare: (s) => s.indirectShare,
  totalCost: (s) => s.totalCost,
  costPerStudent: (s) => s.costPerStudent ?? -1,
  updatedAt: (s) => s.updatedAt,
};

function buildListItems(): CostSheetListItem[] {
  const coursesById = new Map(courseTable.map((c) => [c.id, c]));

  const items: CostSheetListItem[] = [];
  for (const sheet of courseCostSheetTable) {
    const course = coursesById.get(sheet.courseId);
    if (!course) continue;

    const breakdown = courseBreakdownFor(sheet);
    items.push({
      id: sheet.id,
      courseId: sheet.courseId,
      courseCode: course.code,
      courseName: course.name,
      semesterCode: sheet.semesterCode,
      status: sheet.status,
      currency: sheet.currency,
      studentCount: breakdown.studentCount,
      directTotal: breakdown.directTotal,
      indirectShare: breakdown.indirectShare,
      totalCost: breakdown.totalCost,
      costPerStudent: breakdown.costPerStudent,
      programTermId:
        termForCourse(sheet.courseId, sheet.semesterCode)?.id ?? null,
      updatedAt: sheet.updatedAt,
    });
  }
  return items;
}

export function listCostSheets(query: CostQuery): PaginatedResult<CostSheetListItem> {
  const filtered = buildListItems().filter((item) => {
    if (query.courseId && item.courseId !== query.courseId) return false;
    if (query.semester && item.semesterCode !== query.semester) return false;
    if (query.status && item.status !== query.status) return false;
    return matchesSearch(query.search, item.courseCode, item.courseName, item.semesterCode);
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "courseCode");
  return paginate(sorted, query.page, query.pageSize);
}

export function getCostSheet(costSheetId: string): CourseCostSheetDetail | undefined {
  const sheet = courseCostSheetTable.find((s) => s.id === costSheetId);
  return sheet ? courseDetailFrom(sheet) : undefined;
}

/** Cost sheets recorded against one course, for the course detail page. */
export function costSheetsForCourse(courseId: string): CostSheetListItem[] {
  return buildListItems().filter((item) => item.courseId === courseId);
}

/**
 * Adjust the head count or the status, and recompute.
 *
 * Markup and the rounding step are **not** here any more: both moved to the
 * program term (§13), because a package is priced once and several per-course
 * markups would leave a program total that no screen adds up.
 *
 * Nothing is stored - see docs/decisions/why-bff.md - but the response is the
 * sheet as it would have been saved, with the breakdown recalculated from the
 * new values.
 */
export function updateCostSheet(
  costSheetId: string,
  input: CostSheetUpdateInput,
): CourseCostSheetDetail | undefined {
  const current = courseCostSheetTable.find((s) => s.id === costSheetId);
  if (!current) return undefined;

  return courseDetailFrom({
    ...current,
    studentCount: input.studentCount ?? current.studentCount,
    status: input.status ?? current.status,
  });
}

function courseDetailFrom(sheet: CourseCostSheet): CourseCostSheetDetail | undefined {
  const course = courseTable.find((c) => c.id === sheet.courseId);
  if (!course) return undefined;

  const term = termForCourse(sheet.courseId, sheet.semesterCode);
  const programSheet = term
    ? programCostSheetTable.find((entry) => entry.programTermId === term.id)
    : undefined;
  const program = term ? programCostBreakdownFor(term) : undefined;
  const breakdown =
    program?.courses.find((entry) => entry.courseId === sheet.courseId) ??
    calculateStandaloneCourseCost({
      courseId: sheet.courseId,
      courseCode: course.code,
      courseName: course.name,
      credits: course.credits,
      sheet,
    });

  return {
    sheet,
    courseCode: course.code,
    courseName: course.name,
    breakdown,
    programTermId: term?.id ?? null,
    programCostSheetId: programSheet?.id ?? null,
    indirectTotal: program?.indirectTotal ?? 0,
    markupPercent: program?.markupPercent ?? 0,
    drift: catalogDriftFor(sheet),
  };
}

/* -------------------------------------------------------------------------- */
/* Program cost sheets                                                      */
/* -------------------------------------------------------------------------- */

export interface ProgramCostSheetDetail {
  sheet: ProgramCostSheet;
  programTermId: string;
  programCode: string;
  programName: string;
  semesterCode: string;
  packagePrice: number;
  breakdown: ProgramCostBreakdown;
  drift: CatalogComparison[];
}

export function getProgramCostSheetByTerm(
  programTermId: string,
): ProgramCostSheetDetail | undefined {
  const term = programTermTable.find((entry) => entry.id === programTermId);
  const sheet = programCostSheetTable.find(
    (entry) => entry.programTermId === programTermId,
  );
  if (!term || !sheet) return undefined;
  return programDetailFrom(sheet, term);
}

export function getProgramCostSheet(
  programCostSheetId: string,
): ProgramCostSheetDetail | undefined {
  const sheet = programCostSheetTable.find((entry) => entry.id === programCostSheetId);
  if (!sheet) return undefined;
  const term = programTermTable.find((entry) => entry.id === sheet.programTermId);
  return term ? programDetailFrom(sheet, term) : undefined;
}

function programDetailFrom(
  sheet: ProgramCostSheet,
  term: ProgramTerm,
): ProgramCostSheetDetail | undefined {
  const breakdown = programCostBreakdownFor(term, sheet);
  if (!breakdown) return undefined;

  const program = programTable.find((entry) => entry.id === term.programId);

  return {
    sheet,
    programTermId: term.id,
    programCode: program?.code ?? term.programId,
    programName: program?.name ?? "Unknown program",
    semesterCode: term.semesterCode,
    packagePrice: term.packagePrice,
    breakdown,
    drift: catalogDriftFor(sheet),
  };
}

/**
 * Change the markup, the rounding step, the driver or the status.
 *
 * All four are program-level by design (§13). The driver is accepted even
 * though only one value exists, because refusing a field the type allows would
 * be a lie about what the endpoint supports.
 */
export function updateProgramCostSheet(
  programCostSheetId: string,
  input: ProgramCostSheetUpdateInput,
): ProgramCostSheetDetail | undefined {
  const current = programCostSheetTable.find((s) => s.id === programCostSheetId);
  if (!current) return undefined;
  const term = programTermTable.find((entry) => entry.id === current.programTermId);
  if (!term) return undefined;

  return programDetailFrom(
    {
      ...current,
      markupPercent: input.markupPercent ?? current.markupPercent,
      priceRoundingStep: input.priceRoundingStep ?? current.priceRoundingStep,
      driver: input.driver ?? current.driver,
      status: input.status ?? current.status,
    },
    term,
  );
}

export interface ProgramCostQuery extends ListQueryInput {
  programId?: string;
  semester?: string;
  status?: string;
}

/**
 * A program cost sheet as a table row.
 *
 * The index of Cost Management (revised 2026-09-16): the program term is
 * where a costing is finished, so it is what a cost list should lead with. A
 * course sheet is a contributing part and lists separately.
 */
export interface ProgramCostListItem {
  id: string;
  programTermId: string;
  programId: string;
  programCode: string;
  programName: string;
  semesterCode: string;
  status: ProgramCostSheet["status"];
  currency: string;
  courseCount: number;
  studentCount: number;
  directTotal: number;
  indirectTotal: number;
  totalCost: number;
  costPerStudent: number | null;
  preferredPrice: number | null;
  /** What the term actually charges, for the comparison the list exists to make. */
  packagePrice: number;
  /** Curriculum courses with no direct sheet. Unknown, never zero (§13a). */
  missingCostSheets: number;
  updatedAt: string;
}

const PROGRAM_SORTABLE: Record<
  string,
  (row: ProgramCostListItem) => string | number
> = {
  programCode: (s) => s.programCode,
  semesterCode: (s) => s.semesterCode,
  status: (s) => s.status,
  courseCount: (s) => s.courseCount,
  studentCount: (s) => s.studentCount,
  directTotal: (s) => s.directTotal,
  indirectTotal: (s) => s.indirectTotal,
  totalCost: (s) => s.totalCost,
  costPerStudent: (s) => s.costPerStudent ?? -1,
  preferredPrice: (s) => s.preferredPrice ?? -1,
  packagePrice: (s) => s.packagePrice,
  updatedAt: (s) => s.updatedAt,
};

function buildProgramListItems(): ProgramCostListItem[] {
  const programsById = new Map(programTable.map((program) => [program.id, program]));
  const items: ProgramCostListItem[] = [];

  for (const sheet of programCostSheetTable) {
    const term = programTermTable.find((entry) => entry.id === sheet.programTermId);
    if (!term) continue;
    const program = programsById.get(term.programId);
    const breakdown = programCostBreakdownFor(term, sheet);
    if (!breakdown) continue;

    items.push({
      id: sheet.id,
      programTermId: term.id,
      programId: term.programId,
      programCode: program?.code ?? term.programId,
      programName: program?.name ?? "Unknown program",
      semesterCode: sheet.semesterCode,
      status: sheet.status,
      currency: sheet.currency,
      courseCount: breakdown.courses.length,
      studentCount: breakdown.studentCount,
      directTotal: breakdown.directTotal,
      indirectTotal: breakdown.indirectTotal,
      totalCost: breakdown.totalCost,
      costPerStudent: breakdown.costPerStudent,
      preferredPrice: breakdown.preferredPrice,
      packagePrice: term.packagePrice,
      missingCostSheets: breakdown.coursesMissingCostSheet.length,
      updatedAt: sheet.updatedAt,
    });
  }

  return items;
}

export function listProgramCostSheets(
  query: ProgramCostQuery,
): PaginatedResult<ProgramCostListItem> {
  const filtered = buildProgramListItems().filter((item) => {
    if (query.programId && item.programId !== query.programId) return false;
    if (query.semester && item.semesterCode !== query.semester) return false;
    if (query.status && item.status !== query.status) return false;
    return matchesSearch(
      query.search,
      item.programCode,
      item.programName,
      item.semesterCode,
    );
  });

  const sorted = sortRows(
    filtered,
    PROGRAM_SORTABLE,
    query.sort,
    query.direction,
    "programCode",
  );
  return paginate(sorted, query.page, query.pageSize);
}

/* -------------------------------------------------------------------------- */
/* Sheet contents (direction.md §12a)                                         */
/* -------------------------------------------------------------------------- */

/** Either detail, since one set of content writes serves both sheets. */
export type SheetDetail = CourseCostSheetDetail | ProgramCostSheetDetail;

/** The shape a write returns when the request was legal but the domain says no. */
export interface SheetWriteError {
  fieldErrors: Record<string, string>;
}

export function isSheetWriteError(
  result: SheetDetail | SheetWriteError,
): result is SheetWriteError {
  return "fieldErrors" in result;
}

/**
 * Either sheet, found by id, so one set of content writes serves both.
 *
 * The alternative was a course version and a program version of every write,
 * which is six near-identical functions and six chances for them to diverge on
 * what "add an item" means.
 */
type AnySheet =
  | { kind: "course"; sheet: CourseCostSheet }
  | { kind: "program"; sheet: ProgramCostSheet };

function findSheet(sheetId: string): AnySheet | undefined {
  const course = courseCostSheetTable.find((entry) => entry.id === sheetId);
  if (course) return { kind: "course", sheet: course };
  const program = programCostSheetTable.find((entry) => entry.id === sheetId);
  if (program) return { kind: "program", sheet: program };
  return undefined;
}

/** What kind of cost item may sit on this sheet (§12). */
function allowedKind(found: AnySheet): CostKind {
  return found.kind === "course" ? "direct" : "indirect";
}


function detailFor(found: AnySheet, groups: CostGroup[]): SheetDetail | undefined {
  if (found.kind === "course") {
    return courseDetailFrom({ ...found.sheet, groups });
  }
  const term = programTermTable.find((entry) => entry.id === found.sheet.programTermId);
  return term ? programDetailFrom({ ...found.sheet, groups }, term) : undefined;
}

/** Replace one group's items, leaving the rest of the sheet alone. */
function withGroupItems(
  groups: readonly CostGroup[],
  groupId: string,
  items: CostItem[],
): CostGroup[] {
  return groups.map((group) => (group.id === groupId ? { ...group, items } : group));
}

/**
 * Add a catalog item to one of a sheet's groups.
 *
 * The copy is taken by `copyCatalogItem`, the only implementation of the
 * snapshot rule. Adding the same catalog item twice is allowed and
 * deliberate: two lecturers on one course are two lines rather than one line at
 * quantity two, because they may sit at different rates. The sheet's existing
 * ids go in with the source so the second line is a line and not an alias of
 * the first - which it was until `AUD-013` closed on 2026-09-20.
 *
 * **The kind is checked here and nowhere else matters.** Putting a classroom on
 * a course sheet is how the old model double-counted; refusing it server-side
 * is what makes that unrepresentable rather than merely discouraged.
 */
export function addItemToSheet(
  sheetId: string,
  input: SheetItemAddInput,
): SheetDetail | SheetWriteError | undefined {
  const found = findSheet(sheetId);
  if (!found) return undefined;

  const group = found.sheet.groups.find((entry) => entry.id === input.groupId);
  if (!group) {
    return { fieldErrors: { groupId: "That cost group is not on this sheet." } };
  }

  const source = findCatalogItem(input.catalogItemId);
  if (!source) {
    return { fieldErrors: { catalogItemId: "That catalog item no longer exists." } };
  }
  if (source.status === "archived") {
    return {
      fieldErrors: {
        catalogItemId:
          "That catalog item is archived. It stays readable for provenance, but cannot be added to a sheet.",
      },
    };
  }

  const wanted = allowedKind(found);
  if (source.kind !== wanted) {
    return {
      fieldErrors: {
        catalogItemId:
          wanted === "direct"
            ? "That is an indirect cost. It belongs to the program term, which shares it across the whole curriculum."
            : "That is a direct cost. It belongs to a single course, not to the program.",
      },
    };
  }

  // Every id already on the sheet, not just in this group: `updateSheetItem`
  // and `removeSheetItem` search the whole sheet for a match, so an id that is
  // unique within its group and repeated across two is still an alias.
  const taken = found.sheet.groups.flatMap((entry) =>
    entry.items.map((item) => item.id),
  );
  const copy = copyCatalogItem(source, { quantity: input.quantity }, taken);
  return detailFor(
    found,
    withGroupItems(found.sheet.groups, group.id, [...group.items, copy]),
  );
}

/**
 * Change the numbers on one of a sheet's items.
 *
 * Name and kind are not editable. An item's identity came from the catalog,
 * and letting a sheet rename its copy would make the provenance say one thing
 * and the row another.
 */
export function updateSheetItem(
  sheetId: string,
  itemId: string,
  input: SheetItemUpdateInput,
): SheetDetail | undefined {
  const found = findSheet(sheetId);
  const group = found?.sheet.groups.find((entry) =>
    entry.items.some((item) => item.id === itemId),
  );
  if (!found || !group) return undefined;

  const items = group.items.map((item) =>
    item.id === itemId ? applySheetItemUpdate(item, input) : item,
  );

  return detailFor(found, withGroupItems(found.sheet.groups, group.id, items));
}

function applySheetItemUpdate(item: CostItem, input: SheetItemUpdateInput): CostItem {
  return {
    ...item,
    unitPrice: input.unitPrice ?? item.unitPrice,
    quantity: input.quantity ?? item.quantity,
    selectedOptionId: input.selectedOptionId ?? item.selectedOptionId,
  };
}

/** Remove one item from a sheet. The catalog is untouched. */
export function removeSheetItem(
  sheetId: string,
  itemId: string,
): SheetDetail | undefined {
  const found = findSheet(sheetId);
  const group = found?.sheet.groups.find((entry) =>
    entry.items.some((item) => item.id === itemId),
  );
  if (!found || !group) return undefined;

  return detailFor(
    found,
    withGroupItems(
      found.sheet.groups,
      group.id,
      group.items.filter((item) => item.id !== itemId),
    ),
  );
}

/**
 * Start a new group on a sheet, from a catalog group.
 *
 * Empty to begin with. Copying every item of the group would be the friendlier
 * default and the wrong one: a sheet is a deliberate selection, and a group
 * that arrives full invites someone to delete six lines rather than add two.
 */
export function addGroupToSheet(
  sheetId: string,
  input: SheetGroupAddInput,
): SheetDetail | SheetWriteError | undefined {
  const found = findSheet(sheetId);
  if (!found) return undefined;

  const source = getCatalogGroup(input.catalogGroupId);
  if (!source) {
    return {
      fieldErrors: { catalogGroupId: "That catalog group no longer exists." },
    };
  }
  if (found.sheet.groups.some((group) => group.catalogGroupId === source.id)) {
    return { fieldErrors: { catalogGroupId: "This sheet already has that group." } };
  }
  // A group with nothing this sheet may hold is an empty box that can never be
  // filled - the catalog group exists, but all of its items are the wrong
  // kind for this sheet.
  if (!source.items.some((item) => item.kind === allowedKind(found))) {
    return {
      fieldErrors: {
        catalogGroupId:
          allowedKind(found) === "direct"
            ? "That group holds only indirect costs, which belong to the program term."
            : "That group holds only direct costs, which belong to a course.",
      },
    };
  }

  return detailFor(found, [
    ...found.sheet.groups,
    {
      id: `grp-${source.id}-${found.sheet.id}`,
      name: source.name,
      catalogGroupId: source.id,
      items: [],
    },
  ]);
}

/**
 * How each of a sheet's items now compares with the catalog (§12a).
 *
 * Computed on read, never stored: it is a comparison between two records, and a
 * stored comparison is a stored value that can go stale - which is the failure
 * the snapshot rule exists to avoid.
 *
 * Only the unit price is compared. Quantity is expected to differ per sheet,
 * because the catalog carries defaults rather than truths, and reporting that
 * as drift would mark almost every row.
 */
export function catalogDriftFor(
  sheet: Readonly<{ groups: readonly CostGroup[] }>,
): CatalogComparison[] {
  return sheet.groups.flatMap((group) =>
    group.items.map((item) => compareWithCatalog(item)),
  );
}

function compareWithCatalog(item: CostItem): CatalogComparison {
  if (!item.catalogItemId) return { itemId: item.id, drift: "none" };

  const source = findCatalogItem(item.catalogItemId);
  if (!source) return { itemId: item.id, drift: "orphaned" };

  return {
    itemId: item.id,
    drift: source.defaultUnitPrice === item.unitPrice ? "current" : "differs",
    catalogName: source.name,
    sheetUnitPrice: item.unitPrice,
    catalogUnitPrice: source.defaultUnitPrice,
  };
}

/** Move one item back onto the catalog's current price. A deliberate act. */
export function realignSheetItem(
  sheetId: string,
  itemId: string,
): SheetDetail | undefined {
  const found = findSheet(sheetId);
  const group = found?.sheet.groups.find((entry) =>
    entry.items.some((item) => item.id === itemId),
  );
  if (!found || !group) return undefined;

  const target = group.items.find((item) => item.id === itemId);
  const source = target?.catalogItemId
    ? findCatalogItem(target.catalogItemId)
    : undefined;
  if (!source) return undefined;

  return detailFor(
    found,
    withGroupItems(
      found.sheet.groups,
      group.id,
      group.items.map((item) =>
        item.id === itemId ? { ...item, unitPrice: source.defaultUnitPrice } : item,
      ),
    ),
  );
}

export { calculateCourseDirect };
