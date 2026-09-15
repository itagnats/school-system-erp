import { z } from "zod";

/**
 * The cost catalogue over the wire (direction.md §12a).
 *
 * Two sets of writes live here, and keeping them apart is the point: editing
 * the catalogue changes what the *next* sheet will copy, while the sheet writes
 * change one sheet and nothing else. Nothing in this file can make a catalogue
 * edit reach a sheet that has already copied from it.
 */

const catalogueStatus = z.enum(["active", "archived"]);
const costKind = z.enum(["direct", "indirect"]);

const name = z
  .string({ message: "A name is required" })
  .trim()
  .min(2, "A name needs at least two characters")
  .max(60, "Keep the name under 60 characters");

const money = z
  .number({ message: "That must be a number" })
  .min(0, "A price cannot be negative")
  .max(5_000_000, "That is larger than any cost in this demo");

const quantity = z
  .number({ message: "A quantity must be a number" })
  .min(0.5, "A quantity below a half is almost certainly a typo")
  .max(10_000, "That is larger than any quantity in this demo");

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

const costOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  unitPrice: z.number(),
  note: z.string().optional(),
});

export const catalogueItemSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  kind: costKind,
  defaultUnitPrice: z.number(),
  defaultQuantity: z.number(),
  options: z.array(costOptionSchema),
  status: catalogueStatus,
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const catalogueGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: catalogueStatus,
  items: z.array(catalogueItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The catalogue is returned whole rather than paginated.
 *
 * It is a maintenance screen over a few dozen rows read by group, and a page
 * boundary through a three-level tree can end half way down a group.
 */
export const catalogueListSchema = z.object({
  groups: z.array(catalogueGroupSchema),
});

export type CatalogueListResponse = z.infer<typeof catalogueListSchema>;

/* -------------------------------------------------------------------------- */
/* Catalogue writes                                                           */
/* -------------------------------------------------------------------------- */

export const catalogueGroupCreateSchema = z.object({
  name,
  description: z.string().trim().max(200, "Keep the description short").optional(),
});

export type CatalogueGroupCreateInput = z.infer<typeof catalogueGroupCreateSchema>;

/**
 * Declared field by field rather than from `create.partial()`.
 *
 * `.partial()` keeps each field's `.default()`, so a PATCH carrying one field
 * validates to an object with the rest filled in with empty defaults - and
 * merging that over a stored record wipes them. That shipped once on courses
 * and is pinned by `tests/contracts/course-contract.test.ts`.
 */
export const catalogueGroupUpdateSchema = z.object({
  name: name.optional(),
  description: z.string().trim().max(200).optional(),
  status: catalogueStatus.optional(),
});

export type CatalogueGroupUpdateInput = z.infer<typeof catalogueGroupUpdateSchema>;

export const catalogueItemCreateSchema = z.object({
  name,
  kind: costKind,
  defaultUnitPrice: money,
  defaultQuantity: quantity,
  note: z.string().trim().max(200).optional(),
});

export type CatalogueItemCreateInput = z.infer<typeof catalogueItemCreateSchema>;

export const catalogueItemUpdateSchema = z.object({
  name: name.optional(),
  kind: costKind.optional(),
  defaultUnitPrice: money.optional(),
  defaultQuantity: quantity.optional(),
  status: catalogueStatus.optional(),
  note: z.string().trim().max(200).optional(),
});

export type CatalogueItemUpdateInput = z.infer<typeof catalogueItemUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Sheet-content writes                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Add a catalogue item to a sheet group.
 *
 * The price is not in this request, and that is deliberate: it comes from the
 * catalogue at the moment of copying. A client that could name the price would
 * make the resulting item's provenance a claim rather than a fact.
 */
export const sheetItemAddSchema = z.object({
  groupId: z.string().min(1, "Pick a cost group"),
  catalogueItemId: z.string().min(1, "Pick a catalogue item"),
  quantity: quantity.optional(),
});

export type SheetItemAddInput = z.infer<typeof sheetItemAddSchema>;

/** What a sheet may change on its own copy. Name and kind are not on the list. */
export const sheetItemUpdateSchema = z.object({
  unitPrice: money.optional(),
  quantity: quantity.optional(),
  selectedOptionId: z.string().optional(),
});

export type SheetItemUpdateInput = z.infer<typeof sheetItemUpdateSchema>;

export const sheetGroupAddSchema = z.object({
  catalogueGroupId: z.string().min(1, "Pick a catalogue group"),
});

export type SheetGroupAddInput = z.infer<typeof sheetGroupAddSchema>;
