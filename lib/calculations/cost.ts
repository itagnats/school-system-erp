import type {
  CostBreakdown,
  CostGroupBreakdown,
  CostItem,
  CostItemBreakdown,
  CostSheet,
} from "@/types";
import { percentOf, roundMoney } from "./number";

/**
 * Cost calculation (direction.md §13).
 *
 *   Direct costs + Shared costs = Total course cost
 *   Total course cost / Number of students = Cost per student
 *
 * Every intermediate figure is kept rather than collapsed into a total, because
 * the UI is required to show the arithmetic instead of hiding the business
 * logic. A screen that renders only `costPerStudent` cannot explain itself.
 *
 * Two rules worth stating:
 *   - a shared item reaches this sheet through an allocation percentage, so its
 *     contribution is `unitPrice x quantity x allocation / 100`. A direct item
 *     always allocates 100, which is why the same formula covers both;
 *   - `costPerStudent` is null, not zero, when there are no students. Zero is a
 *     number a reader would believe.
 */

/** The price actually used for an item: the selected option, or the item. */
export function effectiveUnitPrice(item: CostItem): number {
  if (!item.selectedOptionId) return item.unitPrice;
  const option = item.options.find((o) => o.id === item.selectedOptionId);
  return option ? option.unitPrice : item.unitPrice;
}

export function calculateItemBreakdown(item: CostItem): CostItemBreakdown {
  const unitPrice = effectiveUnitPrice(item);
  const gross = roundMoney(unitPrice * item.quantity);
  const allocated = roundMoney((gross * item.allocationPercent) / 100);

  return {
    itemId: item.id,
    itemName: item.name,
    kind: item.kind,
    unitPrice,
    quantity: item.quantity,
    gross,
    allocationPercent: item.allocationPercent,
    allocated,
  };
}

export function calculateCostBreakdown(sheet: CostSheet): CostBreakdown {
  const groups: CostGroupBreakdown[] = sheet.groups.map((group) => {
    const items = group.items.map(calculateItemBreakdown);
    const directTotal = roundMoney(
      items.filter((i) => i.kind === "direct").reduce((sum, i) => sum + i.allocated, 0),
    );
    const sharedTotal = roundMoney(
      items.filter((i) => i.kind === "shared").reduce((sum, i) => sum + i.allocated, 0),
    );

    return {
      groupId: group.id,
      groupName: group.name,
      directTotal,
      sharedTotal,
      total: roundMoney(directTotal + sharedTotal),
      // Filled in below: a share is a share of the sheet, which is not known
      // until every group has been totalled.
      sharePercent: 0,
      items,
    };
  });

  const directTotal = roundMoney(groups.reduce((sum, g) => sum + g.directTotal, 0));
  const sharedTotal = roundMoney(groups.reduce((sum, g) => sum + g.sharedTotal, 0));
  const subtotal = roundMoney(directTotal + sharedTotal);
  const markupAmount = roundMoney((subtotal * sheet.markupPercent) / 100);
  const totalCost = roundMoney(subtotal + markupAmount);

  for (const group of groups) {
    group.sharePercent = totalCost > 0 ? percentOf(group.total, totalCost) : 0;
  }

  return {
    directTotal,
    sharedTotal,
    subtotal,
    markupAmount,
    totalCost,
    studentCount: sheet.studentCount,
    costPerStudent:
      sheet.studentCount > 0 ? roundMoney(totalCost / sheet.studentCount) : null,
    groups,
  };
}

/** Total course cost only, for a list row that has no room for the working. */
export function calculateTotalCost(sheet: CostSheet): number {
  return calculateCostBreakdown(sheet).totalCost;
}

/** Cost per student only. Null when the sheet has no students. */
export function calculateCostPerStudent(sheet: CostSheet): number | null {
  return calculateCostBreakdown(sheet).costPerStudent;
}
