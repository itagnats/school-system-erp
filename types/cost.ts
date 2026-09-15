import type { SemesterCode } from "./common";

/**
 * Cost structure (direction.md §11-13, revised 2026-09-15):
 *
 *   Course    -> Course Cost Sheet     -> Cost Group -> Cost Item -> Cost Option
 *   Prog Term -> Programme Cost Sheet  -> Cost Group -> Cost Item -> Cost Option
 *
 * **The kind decides which sheet an item may sit on.** A direct cost belongs
 * wholly to one course and lives on that course's sheet. An indirect cost is
 * borne once by the programme term and is distributed across its curriculum by
 * a driver, never by a hand-entered percentage.
 *
 * `shared` was the old name for `indirect`, and the rename is not cosmetic: the
 * old model shared a cost by copying it onto every course that used it and
 * letting each take a percentage of nothing in particular.
 */
export type CostKind = "direct" | "indirect";

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

/* -------------------------------------------------------------------------- */
/* The two sheets (direction.md §11, revised 2026-09-15)                      */
/* -------------------------------------------------------------------------- */

/**
 * Direct costs for one course in one semester.
 *
 * Entered once and the same whichever programme adds the course, which is what
 * "the cost of running IT101" means. Holds **only** `direct` items; an indirect
 * cost has no business here, because it is not this course's to bear.
 *
 * A course-semester that belongs to no programme term still has one of these.
 * It simply receives no indirect share.
 */
export interface CourseCostSheet {
  id: string;
  courseId: string;
  semesterCode: SemesterCode;
  status: CostSheetStatus;
  /** Direct groups and items only. */
  groups: CostGroup[];
  /** Head count on this course, which its own per-student figure divides by. */
  studentCount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * What distributes a programme's indirect pool across its curriculum.
 *
 * A union with one member on purpose. Contact hours were the obvious second
 * driver and are unusable against this data — the lecturer-hours quantity does
 * not rise with credits — so adding one means first making hours mean
 * something, not just adding a case here.
 */
export type CostDriver = "credits";

/**
 * Indirect costs for one programme term, and how they are shared out.
 *
 * Borne **once**: the programme rents the room, runs the workshop. Holds only
 * `indirect` items, and no item carries a percentage — the share is derived
 * from the driver, which is what makes it impossible for the shares not to
 * total 100.
 */
export interface ProgramCostSheet {
  id: string;
  programTermId: string;
  semesterCode: SemesterCode;
  status: CostSheetStatus;
  /** Indirect groups and items only. */
  groups: CostGroup[];
  driver: CostDriver;
  /** One markup for the whole term, applied after each share lands. */
  markupPercent: number;
  /**
   * What a preferred price rounds up to (direction.md §13).
   *
   * On the programme rather than the course, because the markup and the pool
   * are both programme-level and a price built from them should not round by
   * one rule per course.
   */
  priceRoundingStep: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Breakdowns (direction.md §13)                                              */
/* -------------------------------------------------------------------------- */

export interface CostItemBreakdown {
  itemId: string;
  itemName: string;
  kind: CostKind;
  unitPrice: number;
  quantity: number;
  /** unitPrice * quantity. The whole cost — nothing is taken off it here. */
  total: number;
}

export interface CostGroupBreakdown {
  groupId: string;
  groupName: string;
  total: number;
  /** Share of the sheet this group is on, 0-100. */
  sharePercent: number;
  items: CostItemBreakdown[];
}

/**
 * One course inside a programme's costing — or standing alone.
 *
 * `indirectShare` is zero and `sharePercent` null when the course belongs to no
 * programme term. Null rather than zero for the share because "no programme to
 * take a share of" and "a 0% share of one" are different claims.
 */
export interface CourseCostBreakdown {
  courseId: string;
  courseCode: string;
  courseName: string;
  /** The driver value behind this course's share. */
  credits: number;
  /** Share of the programme's indirect pool, 0-100. Null when unaffiliated. */
  sharePercent: number | null;
  directTotal: number;
  indirectShare: number;
  /** directTotal + indirectShare, before markup. */
  subtotal: number;
  markupAmount: number;
  /** subtotal + markupAmount. */
  totalCost: number;
  studentCount: number;
  /** totalCost / studentCount, or null when there are no students. */
  costPerStudent: number | null;
  /** Direct groups only. The indirect ones belong to the programme. */
  groups: CostGroupBreakdown[];
}

/**
 * What a programme costing needs to know about one of its courses.
 *
 * The sheet is optional because a curriculum may name a course that has no
 * direct cost sheet yet. That course still takes its share of the pool — it is
 * in the curriculum and the room was booked for it — but its direct cost is
 * reported as missing rather than as zero.
 */
export interface CourseCostInput {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  sheet?: CourseCostSheet;
}

/**
 * A programme term's costing, and every course inside it.
 *
 * Both per-student figures are carried because they answer different questions:
 * `courses[].costPerStudent` says which course is expensive to run, and
 * `costPerStudent` here is the figure comparable to the package price, since a
 * package is sold per student for the whole curriculum.
 */
export interface ProgramCostBreakdown {
  programTermId: string;
  driver: CostDriver;
  /** Sum of the course direct totals. */
  directTotal: number;
  /** The pool, borne once. */
  indirectTotal: number;
  /** directTotal + indirectTotal, before markup. */
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  /** subtotal + markupAmount, and equal to the sum of the course totals. */
  totalCost: number;
  /** Enrolment on the programme term, not on any one course. */
  studentCount: number;
  /** totalCost / studentCount, or null when nobody is enrolled. */
  costPerStudent: number | null;
  priceRoundingStep: number;
  /**
   * `costPerStudent` rounded **up** to `priceRoundingStep` (direction.md §13).
   *
   * A cost is a measurement; a price is an offer. Null whenever
   * `costPerStudent` is: a term with no students cannot imply a price.
   */
  preferredPrice: number | null;
  /**
   * `preferredPrice - costPerStudent`. Margin the rounding created rather than
   * margin anyone chose, which is why it is reported separately from
   * `markupAmount` instead of folded into it.
   */
  roundingGain: number | null;
  /** The indirect pool, by group. */
  indirectGroups: CostGroupBreakdown[];
  /** One per course in the curriculum, in curriculum order. */
  courses: CourseCostBreakdown[];
  /**
   * Curriculum courses with no direct cost sheet at all.
   *
   * Reported rather than treated as zero: an unknown cost and a zero cost are
   * different claims, and §13a already refuses to add the first into a total.
   */
  coursesMissingCostSheet: string[];
}
