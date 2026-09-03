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
}

export interface CostGroup {
  id: string;
  /** e.g. `Teaching`, `Facilities`, `Student Activities`. */
  name: string;
  items: CostItem[];
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
