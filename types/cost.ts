import type { SemesterCode } from "./common";

/**
 * Cost structure (direction.md §11-13):
 *
 *   Cost Sheet -> Cost Group -> Cost Item -> Cost Option
 *
 * A direct cost belongs wholly to the course. A shared cost is incurred across
 * several courses and reaches this sheet through an allocation percentage.
 */
export type CostKind = "direct" | "shared";

export type CostSheetStatus = "draft" | "review" | "approved";

/**
 * A selectable variant of a cost item, e.g. the item `Classroom` may offer
 * `Standard room` and `Lab room` at different unit prices. Exactly one option
 * per item is selected; an item with no options prices itself.
 */
export interface CostOption {
  id: string;
  name: string;
  unitPrice: number;
  note?: string;
}

export interface CostItem {
  id: string;
  name: string;
  kind: CostKind;
  /** Unit price used when the item has no options. */
  unitPrice: number;
  quantity: number;
  /** Percentage of a shared cost charged to this sheet. 0-100, direct = 100. */
  allocationPercent: number;
  options: CostOption[];
  selectedOptionId?: string;
  note?: string;
  /**
   * The catalogue item this was copied from, if any (direction.md §12a).
   *
   * A copy, not a link: the values above are the sheet's own and do not follow
   * the catalogue. This id exists so the sheet can answer "where did this rate
   * come from" and report when the catalogue has since moved on. Absent on a
   * one-off cost typed straight onto the sheet.
   */
  catalogueItemId?: string;
  /** When the copy was taken. Absent on a one-off cost. */
  copiedAt?: string;
}

export interface CostGroup {
  id: string;
  /** e.g. `Teaching`, `Facilities`, `Student Activities`. */
  name: string;
  items: CostItem[];
  /** The catalogue group this group corresponds to, if any. */
  catalogueGroupId?: string;
}

/* -------------------------------------------------------------------------- */
/* The catalogue (direction.md §12a)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Archived rather than deleted, once a sheet has used it.
 *
 * The sheets hold copies and would survive a delete, but their provenance would
 * point at nothing — and "where did this rate come from" is the question the
 * catalogue exists to answer.
 */
export type CatalogueStatus = "active" | "archived";

/**
 * A reusable cost line, maintained once and copied onto sheets.
 *
 * The prices and quantities here are **defaults, not truths**. Forty-five
 * contact hours is the usual case; a sheet is free to say otherwise, and doing
 * so is not a correction to the catalogue.
 */
export interface CatalogueItem {
  id: string;
  groupId: string;
  name: string;
  kind: CostKind;
  /** Default unit price, used when the item has no options. */
  defaultUnitPrice: number;
  defaultQuantity: number;
  /** Default allocation. Direct items are always 100. */
  defaultAllocationPercent: number;
  options: CostOption[];
  status: CatalogueStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogueGroup {
  id: string;
  /** e.g. `Teaching`, `Facilities`, `Student Activities`. */
  name: string;
  description?: string;
  status: CatalogueStatus;
  items: CatalogueItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * How a sheet item compares with the catalogue item it was copied from.
 *
 * `none` covers both a one-off cost and an item whose catalogue entry has been
 * removed; the two are distinguished by whether `catalogueItemId` is set at all.
 * Computed on read rather than stored, because it is a comparison between two
 * records and storing a comparison means storing something that can go stale.
 */
export type CatalogueDrift = "none" | "current" | "differs" | "orphaned";

/** What a sheet item's price and the catalogue's now say, when they disagree. */
export interface CatalogueComparison {
  itemId: string;
  drift: CatalogueDrift;
  catalogueName?: string;
  sheetUnitPrice?: number;
  catalogueUnitPrice?: number;
}

export interface CostSheet {
  id: string;
  courseId: string;
  semesterCode: SemesterCode;
  status: CostSheetStatus;
  groups: CostGroup[];
  /** Optional markup applied to the total, as a percentage. */
  markupPercent: number;
  /** Head count the per-student figure divides by. */
  studentCount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Output of the cost calculation layer. Every intermediate figure is kept so
 * the UI can show the arithmetic instead of hiding it (direction.md §13).
 */
export interface CostBreakdown {
  directTotal: number;
  sharedTotal: number;
  /** directTotal + sharedTotal, before markup. */
  subtotal: number;
  markupAmount: number;
  /** subtotal + markupAmount. */
  totalCost: number;
  studentCount: number;
  /** totalCost / studentCount, or null when studentCount is 0. */
  costPerStudent: number | null;
  groups: CostGroupBreakdown[];
}

export interface CostGroupBreakdown {
  groupId: string;
  groupName: string;
  directTotal: number;
  sharedTotal: number;
  total: number;
  /** Share of totalCost, 0-100. */
  sharePercent: number;
  items: CostItemBreakdown[];
}

export interface CostItemBreakdown {
  itemId: string;
  itemName: string;
  kind: CostKind;
  unitPrice: number;
  quantity: number;
  /** unitPrice * quantity, before allocation. */
  gross: number;
  allocationPercent: number;
  /** gross * allocationPercent / 100. */
  allocated: number;
}
