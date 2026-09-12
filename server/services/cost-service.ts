import "server-only";

import { calculateCostBreakdown } from "@/lib/calculations";
import { costSheetTable, courseTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import {
  copyCatalogueItem,
  findCatalogueItem,
  getCatalogueGroup,
} from "./catalogue-service";
import type {
  CostSheetUpdateInput,
  SheetGroupAddInput,
  SheetItemAddInput,
  SheetItemUpdateInput,
} from "@/lib/api/contracts";
import type {
  CatalogueComparison,
  CostBreakdown,
  CostItem,
  CostSheet,
  PaginatedResult,
} from "@/types";

/**
 * Cost sheet reads (direction.md §11-13).
 *
 * The list row carries the derived totals rather than the nested groups. A
 * table needs the total and the per-student figure; sending four levels of
 * nesting so the browser can add them up would move business math into the
 * client, which is exactly what the calculation layer exists to prevent.
 */

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
  status: CostSheet["status"];
  currency: string;
  studentCount: number;
  totalCost: number;
  costPerStudent: number | null;
  updatedAt: string;
}

export interface CostSheetDetail {
  sheet: CostSheet;
  courseCode: string;
  courseName: string;
  breakdown: CostBreakdown;
  /**
   * How each item now compares with the catalogue entry it was copied from.
   *
   * Travels with the sheet rather than sitting on its own endpoint: a sheet is
   * never read without wanting to know which of its rates have been overtaken,
   * and a second request for it would be a second chance to be out of step.
   */
  drift: CatalogueComparison[];
}

const SORTABLE: Record<string, (row: CostSheetListItem) => string | number> = {
  courseCode: (s) => s.courseCode,
  semesterCode: (s) => s.semesterCode,
  status: (s) => s.status,
  studentCount: (s) => s.studentCount,
  totalCost: (s) => s.totalCost,
  costPerStudent: (s) => s.costPerStudent ?? -1,
  updatedAt: (s) => s.updatedAt,
};

function buildListItems(): CostSheetListItem[] {
  const coursesById = new Map(courseTable.map((c) => [c.id, c]));

  const items: CostSheetListItem[] = [];
  for (const sheet of costSheetTable) {
    const course = coursesById.get(sheet.courseId);
    if (!course) continue;

    const breakdown = calculateCostBreakdown(sheet);
    items.push({
      id: sheet.id,
      courseId: sheet.courseId,
      courseCode: course.code,
      courseName: course.name,
      semesterCode: sheet.semesterCode,
      status: sheet.status,
      currency: sheet.currency,
      studentCount: breakdown.studentCount,
      totalCost: breakdown.totalCost,
      costPerStudent: breakdown.costPerStudent,
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

export function getCostSheet(costSheetId: string): CostSheetDetail | undefined {
  const sheet = costSheetTable.find((s) => s.id === costSheetId);
  if (!sheet) return undefined;

  const course = courseTable.find((c) => c.id === sheet.courseId);
  if (!course) return undefined;

  return {
    sheet,
    courseCode: course.code,
    courseName: course.name,
    breakdown: calculateCostBreakdown(sheet),
    drift: catalogueDriftFor(sheet),
  };
}

/** Cost sheets recorded against one course, for the course detail page. */
export function costSheetsForCourse(courseId: string): CostSheetListItem[] {
  return buildListItems().filter((item) => item.courseId === courseId);
}

/**
 * Adjust the three inputs the total depends on, and recompute.
 *
 * Nothing is stored - see docs/decisions/why-bff.md - but the response is the
 * sheet as it would have been saved, with the breakdown recalculated from the
 * new values. That recomputation is the point of the endpoint: markup and head
 * count change the total and the per-student figure, and the client should see
 * the server derive them rather than derive them itself.
 */
export function updateCostSheet(
  costSheetId: string,
  input: CostSheetUpdateInput,
): CostSheetDetail | undefined {
  const current = getCostSheet(costSheetId);
  if (!current) return undefined;

  const next: CostSheet = {
    ...current.sheet,
    markupPercent: input.markupPercent ?? current.sheet.markupPercent,
    studentCount: input.studentCount ?? current.sheet.studentCount,
    status: input.status ?? current.sheet.status,
  };

  return {
    sheet: next,
    courseCode: current.courseCode,
    courseName: current.courseName,
    breakdown: calculateCostBreakdown(next),
    drift: current.drift,
  };
}

/* -------------------------------------------------------------------------- */
/* Sheet contents (direction.md §12a)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Rebuild a detail from a changed sheet.
 *
 * Every write below routes through here so a response always carries the
 * recomputed breakdown. An endpoint returning an acknowledgement would leave
 * the caller to re-derive the total, which is the one thing the calculation
 * layer exists to prevent.
 */
function detailFrom(sheet: CostSheet): CostSheetDetail | undefined {
  const course = courseTable.find((c) => c.id === sheet.courseId);
  if (!course) return undefined;

  return {
    sheet,
    courseCode: course.code,
    courseName: course.name,
    breakdown: calculateCostBreakdown(sheet),
    drift: catalogueDriftFor(sheet),
  };
}

/** Replace one group's items, leaving the rest of the sheet alone. */
function withGroupItems(sheet: CostSheet, groupId: string, items: CostItem[]): CostSheet {
  return {
    ...sheet,
    groups: sheet.groups.map((group) =>
      group.id === groupId ? { ...group, items } : group,
    ),
  };
}

/** The shape a write returns when the request was legal but the domain says no. */
export interface SheetWriteError {
  fieldErrors: Record<string, string>;
}

export function isSheetWriteError(
  result: CostSheetDetail | SheetWriteError,
): result is SheetWriteError {
  return "fieldErrors" in result;
}

/**
 * Add a catalogue item to one of a sheet's groups.
 *
 * The copy is taken by `copyCatalogueItem`, the only implementation of the
 * snapshot rule. Adding the same catalogue item twice is allowed and
 * deliberate: two lecturers on one course are two lines rather than one line at
 * quantity two, because they may sit at different rates.
 */
export function addItemToSheet(
  costSheetId: string,
  input: SheetItemAddInput,
): CostSheetDetail | SheetWriteError | undefined {
  const current = costSheetTable.find((s) => s.id === costSheetId);
  if (!current) return undefined;

  const group = current.groups.find((entry) => entry.id === input.groupId);
  if (!group) {
    return { fieldErrors: { groupId: "That cost group is not on this sheet." } };
  }

  const source = findCatalogueItem(input.catalogueItemId);
  if (!source) {
    return { fieldErrors: { catalogueItemId: "That catalogue item no longer exists." } };
  }
  if (source.status === "archived") {
    return {
      fieldErrors: {
        catalogueItemId:
          "That catalogue item is archived. It stays readable for provenance, but cannot be added to a sheet.",
      },
    };
  }

  const copy = copyCatalogueItem(source, {
    quantity: input.quantity,
    allocationPercent: input.allocationPercent,
  });

  return detailFrom(withGroupItems(current, group.id, [...group.items, copy]));
}

/**
 * Change the numbers on one of a sheet's items.
 *
 * Name and kind are not editable. An item's identity came from the catalogue,
 * and letting a sheet rename its copy would make the provenance say one thing
 * and the row another.
 */
export function updateSheetItem(
  costSheetId: string,
  itemId: string,
  input: SheetItemUpdateInput,
): CostSheetDetail | undefined {
  const current = costSheetTable.find((s) => s.id === costSheetId);
  const group = current?.groups.find((entry) =>
    entry.items.some((item) => item.id === itemId),
  );
  if (!current || !group) return undefined;

  const items = group.items.map((item) =>
    item.id === itemId ? applySheetItemUpdate(item, input) : item,
  );

  return detailFrom(withGroupItems(current, group.id, items));
}

function applySheetItemUpdate(item: CostItem, input: SheetItemUpdateInput): CostItem {
  return {
    ...item,
    unitPrice: input.unitPrice ?? item.unitPrice,
    quantity: input.quantity ?? item.quantity,
    // A direct cost cannot be allocated anywhere but wholly to its own course,
    // whatever the request says (§12).
    allocationPercent:
      item.kind === "direct" ? 100 : (input.allocationPercent ?? item.allocationPercent),
    selectedOptionId: input.selectedOptionId ?? item.selectedOptionId,
  };
}

/** Remove one item from a sheet. The catalogue is untouched. */
export function removeSheetItem(
  costSheetId: string,
  itemId: string,
): CostSheetDetail | undefined {
  const current = costSheetTable.find((s) => s.id === costSheetId);
  const group = current?.groups.find((entry) =>
    entry.items.some((item) => item.id === itemId),
  );
  if (!current || !group) return undefined;

  return detailFrom(
    withGroupItems(
      current,
      group.id,
      group.items.filter((item) => item.id !== itemId),
    ),
  );
}

/**
 * Start a new group on a sheet, from a catalogue group.
 *
 * Empty to begin with. Copying every item of the group would be the friendlier
 * default and the wrong one: a sheet is a deliberate selection, and a group
 * that arrives full invites someone to delete six lines rather than add two.
 */
export function addGroupToSheet(
  costSheetId: string,
  input: SheetGroupAddInput,
): CostSheetDetail | SheetWriteError | undefined {
  const current = costSheetTable.find((s) => s.id === costSheetId);
  if (!current) return undefined;

  const source = getCatalogueGroup(input.catalogueGroupId);
  if (!source) {
    return {
      fieldErrors: { catalogueGroupId: "That catalogue group no longer exists." },
    };
  }
  if (current.groups.some((group) => group.catalogueGroupId === source.id)) {
    return { fieldErrors: { catalogueGroupId: "This sheet already has that group." } };
  }

  return detailFrom({
    ...current,
    groups: [
      ...current.groups,
      {
        id: `grp-${source.id}-${current.id}`,
        name: source.name,
        catalogueGroupId: source.id,
        items: [],
      },
    ],
  });
}

/**
 * How each of a sheet's items now compares with the catalogue (§12a).
 *
 * Computed on read, never stored: it is a comparison between two records, and a
 * stored comparison is a stored value that can go stale - which is the failure
 * the snapshot rule exists to avoid.
 *
 * Only the unit price is compared. Quantity and allocation are expected to
 * differ per sheet, because the catalogue carries defaults rather than truths,
 * and reporting those as drift would mark almost every row.
 */
export function catalogueDriftFor(sheet: CostSheet): CatalogueComparison[] {
  return sheet.groups.flatMap((group) =>
    group.items.map((item) => compareWithCatalogue(item)),
  );
}

function compareWithCatalogue(item: CostItem): CatalogueComparison {
  if (!item.catalogueItemId) return { itemId: item.id, drift: "none" };

  const source = findCatalogueItem(item.catalogueItemId);
  if (!source) return { itemId: item.id, drift: "orphaned" };

  return {
    itemId: item.id,
    drift: source.defaultUnitPrice === item.unitPrice ? "current" : "differs",
    catalogueName: source.name,
    sheetUnitPrice: item.unitPrice,
    catalogueUnitPrice: source.defaultUnitPrice,
  };
}

/** Move one item back onto the catalogue's current price. A deliberate act. */
export function realignSheetItem(
  costSheetId: string,
  itemId: string,
): CostSheetDetail | undefined {
  const current = costSheetTable.find((s) => s.id === costSheetId);
  const group = current?.groups.find((entry) =>
    entry.items.some((item) => item.id === itemId),
  );
  if (!current || !group) return undefined;

  const target = group.items.find((item) => item.id === itemId);
  const source = target?.catalogueItemId
    ? findCatalogueItem(target.catalogueItemId)
    : undefined;
  if (!source) return undefined;

  return detailFrom(
    withGroupItems(
      current,
      group.id,
      group.items.map((item) =>
        item.id === itemId ? { ...item, unitPrice: source.defaultUnitPrice } : item,
      ),
    ),
  );
}
