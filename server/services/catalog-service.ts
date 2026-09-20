import "server-only";

import { catalogGroupTable, courseCostSheetTable, programCostSheetTable } from "@/server/repositories";
import { matchesSearch, type ListQueryInput } from "@/server/query";
import { copyItemId, copyOptionId, copyOrdinal } from "@/lib/calculations";
import type {
  CatalogGroupCreateInput,
  CatalogGroupUpdateInput,
  CatalogItemCreateInput,
  CatalogItemUpdateInput,
} from "@/lib/api/contracts";
import type { CatalogGroup, CatalogItem, CostGroup, CostItem } from "@/types";

/**
 * The master cost catalog (direction.md §12a).
 *
 * A sheet takes a **copy** of a catalog entry, never a reference. That single
 * decision is why this service exists separately from the cost service: the
 * catalog is edited freely, and nothing it does can reach into a sheet that
 * has already been approved. Raising a rate here changes what the *next* sheet
 * will copy, and nothing else.
 *
 * Writes are shaped and validated but not persisted; see docs/decisions/why-bff.md.
 */

export interface CatalogQuery extends ListQueryInput {
  status?: string;
  kind?: string;
}

/**
 * The catalog as a tree.
 *
 * Returned whole rather than paginated: it is a maintenance screen over a few
 * dozen rows that a user reads by group, and paginating a three-level tree
 * gives a page that can end half way through a group.
 */
export function listCatalogGroups(query?: Partial<CatalogQuery>): CatalogGroup[] {
  const search = query?.search ?? "";

  return catalogGroupTable
    .filter((group) => !query?.status || group.status === query.status)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (query?.kind && item.kind !== query.kind) return false;
        // A group matching by name keeps all its items, so searching for
        // "Facilities" does not return an empty group.
        if (matchesSearch(search, group.name)) return true;
        return matchesSearch(search, item.name, item.note);
      }),
    }))
    .filter(
      (group) =>
        group.items.length > 0 || matchesSearch(search, group.name, group.description),
    );
}

export function getCatalogGroup(groupId: string): CatalogGroup | undefined {
  return catalogGroupTable.find((group) => group.id === groupId);
}

export function findCatalogItem(itemId: string): CatalogItem | undefined {
  for (const group of catalogGroupTable) {
    const item = group.items.find((entry) => entry.id === itemId);
    if (item) return item;
  }
  return undefined;
}

/** Options for the "add from catalog" picker on a sheet. */
export function catalogItemOptions(): {
  groupId: string;
  groupName: string;
  items: CatalogItem[];
}[] {
  return catalogGroupTable
    .filter((group) => group.status === "active")
    .map((group) => ({
      groupId: group.id,
      groupName: group.name,
      // An archived item is kept for provenance but must not be added to
      // anything new (§12a).
      items: group.items.filter((item) => item.status === "active"),
    }))
    .filter((group) => group.items.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/** Timestamp for a shaped write. Fixed, because the seed clock is fixed. */
const WRITE_STAMP = "2026-01-05T09:00:00.000Z";

export function createCatalogGroup(input: CatalogGroupCreateInput): CatalogGroup {
  return {
    id: `cat-${slug(input.name)}`,
    name: input.name,
    description: input.description,
    status: "active",
    items: [],
    createdAt: WRITE_STAMP,
    updatedAt: WRITE_STAMP,
  };
}

export function updateCatalogGroup(
  groupId: string,
  input: CatalogGroupUpdateInput,
): CatalogGroup | undefined {
  const current = getCatalogGroup(groupId);
  if (!current) return undefined;

  return {
    ...current,
    name: input.name ?? current.name,
    description: input.description ?? current.description,
    status: input.status ?? current.status,
    updatedAt: WRITE_STAMP,
  };
}

/**
 * How many sheets copied from anything in this group.
 *
 * The number behind the archive-rather-than-delete rule: a group nothing has
 * used can be removed cleanly, and one that has been used cannot, because the
 * copies on those sheets would point at nothing.
 */
/**
 * Every sheet of either kind, for the in-use counts.
 *
 * A catalog item can be copied onto a course sheet or a program one, so a
 * count that looked at only one table would report zero for half the catalog
 * and let a used item be deleted (§12a).
 */
function allSheets(): { groups: readonly CostGroup[] }[] {
  return [...courseCostSheetTable, ...programCostSheetTable];
}

export function sheetsUsingGroup(groupId: string): number {
  const group = getCatalogGroup(groupId);
  if (!group) return 0;

  const itemIds = new Set(group.items.map((item) => item.id));
  return allSheets().filter((sheet) =>
    sheet.groups.some((sheetGroup) =>
      sheetGroup.items.some(
        (item) => item.catalogItemId && itemIds.has(item.catalogItemId),
      ),
    ),
  ).length;
}

export function sheetsUsingItem(itemId: string): number {
  return allSheets().filter((sheet) =>
    sheet.groups.some((group) =>
      group.items.some((item) => item.catalogItemId === itemId),
    ),
  ).length;
}

export function createCatalogItem(
  groupId: string,
  input: CatalogItemCreateInput,
): CatalogGroup | undefined {
  const group = getCatalogGroup(groupId);
  if (!group) return undefined;

  const item: CatalogItem = {
    id: `cat-${slug(input.name)}`,
    groupId,
    name: input.name,
    kind: input.kind,
    defaultUnitPrice: input.defaultUnitPrice,
    defaultQuantity: input.defaultQuantity,
    options: [],
    status: "active",
    note: input.note,
    createdAt: WRITE_STAMP,
    updatedAt: WRITE_STAMP,
  };

  return { ...group, items: [...group.items, item], updatedAt: WRITE_STAMP };
}

export function updateCatalogItem(
  groupId: string,
  itemId: string,
  input: CatalogItemUpdateInput,
): CatalogGroup | undefined {
  const group = getCatalogGroup(groupId);
  if (!group?.items.some((item) => item.id === itemId)) return undefined;

  return {
    ...group,
    items: group.items.map((item) =>
      item.id === itemId ? applyItemUpdate(item, input) : item,
    ),
    updatedAt: WRITE_STAMP,
  };
}

function applyItemUpdate(item: CatalogItem, input: CatalogItemUpdateInput): CatalogItem {
  const kind = input.kind ?? item.kind;
  return {
    ...item,
    name: input.name ?? item.name,
    kind,
    defaultUnitPrice: input.defaultUnitPrice ?? item.defaultUnitPrice,
    defaultQuantity: input.defaultQuantity ?? item.defaultQuantity,
    status: input.status ?? item.status,
    note: input.note ?? item.note,
    updatedAt: WRITE_STAMP,
  };
}

/**
 * Remove an item from the catalog.
 *
 * Refused once a sheet has copied it — archive it instead (§12a). The sheets
 * would survive the delete, since they hold copies, but their provenance would
 * point at nothing and the catalog would stop being able to answer the one
 * question it exists for.
 */
export function deleteCatalogItem(
  groupId: string,
  itemId: string,
): CatalogGroup | { blockedBy: number } | undefined {
  const group = getCatalogGroup(groupId);
  if (!group?.items.some((item) => item.id === itemId)) return undefined;

  const used = sheetsUsingItem(itemId);
  if (used > 0) return { blockedBy: used };

  return {
    ...group,
    items: group.items.filter((item) => item.id !== itemId),
    updatedAt: WRITE_STAMP,
  };
}

export function isBlocked(
  result: CatalogGroup | { blockedBy: number },
): result is { blockedBy: number } {
  return "blockedBy" in result;
}

/* -------------------------------------------------------------------------- */
/* The copy (direction.md §12a)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Take a sheet's copy of a catalog item.
 *
 * The one place the snapshot rule is implemented. Everything the sheet needs is
 * read out here and becomes the sheet's own; the only thing that survives as a
 * link is the id, and that is for provenance rather than for values.
 *
 * Quantity may be overridden at the moment of copying, because the catalog
 * carries defaults rather than truths. There is no allocation to override any
 * more — a share of the indirect pool is derived from the driver (§13).
 *
 * `taken` is every item id already on the destination sheet, and it is what
 * makes two copies of one source distinguishable. The id was built out of
 * `WRITE_STAMP` — a frozen constant, so every copy of a source got the same id
 * and the second line was an alias of the first (`AUD-013`, closed 2026-09-20).
 * `copyOrdinal` replaces the constant with a discriminator that is still
 * deterministic: it is a function of the sheet, not of the clock.
 */
export function copyCatalogItem(
  source: CatalogItem,
  overrides: { quantity?: number; selectedOptionId?: string },
  taken: Iterable<string> = [],
): CostItem {
  const ordinal = copyOrdinal(source.id, taken);
  const options = source.options.map((option) => ({
    ...option,
    id: copyOptionId(option.id, ordinal),
  }));

  // The override names an option on the *catalog* item, so it is translated
  // into this copy's numbering. An override naming nothing on the source falls
  // back to the first option rather than being stored verbatim: a
  // `selectedOptionId` that matches none of the copy's own options is a
  // dangling reference the sheet would carry for the rest of its life.
  const chosen = overrides.selectedOptionId
    ? source.options.find((option) => option.id === overrides.selectedOptionId)
    : undefined;

  return {
    id: copyItemId(source.id, ordinal),
    name: source.name,
    kind: source.kind,
    unitPrice: source.defaultUnitPrice,
    quantity: overrides.quantity ?? source.defaultQuantity,
    options,
    selectedOptionId: chosen ? copyOptionId(chosen.id, ordinal) : options[0]?.id,
    note: source.note,
    catalogItemId: source.id,
    copiedAt: WRITE_STAMP,
  };
}

/** A url-safe id fragment from a display name. */
function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "item"
  );
}
