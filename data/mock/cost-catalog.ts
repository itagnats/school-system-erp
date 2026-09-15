import type { CatalogueGroup, CatalogueItem, CostKind, CostOption } from "@/types";

/**
 * The master cost catalogue (direction.md §12a).
 *
 * An item's **kind decides which sheet it can reach** (§12, revised
 * 2026-09-15): a `direct` item goes onto a course's sheet, an `indirect` one
 * onto a programme term's. Nothing here carries an allocation percentage any
 * more — a share of the indirect pool is derived from the driver (§13).
 *
 * Hand-written rather than generated, and deliberately small: this is the file
 * a reviewer should be able to read in one sitting to learn what a school
 * charges for. The groups and items are the ones §12 uses as its own example.
 *
 * Every sheet in the seed is built from these entries, so the catalogue is load
 * bearing rather than decorative — change a default here and the generated
 * dataset changes with it.
 */

const CREATED = "2025-08-01T09:00:00.000Z";
const UPDATED = "2026-01-05T09:00:00.000Z";

function item(
  groupId: string,
  id: string,
  name: string,
  kind: CostKind,
  defaultUnitPrice: number,
  defaultQuantity: number,
  extra: {
    options?: CostOption[];
    note?: string;
    status?: CatalogueItem["status"];
  } = {},
): CatalogueItem {
  return {
    id,
    groupId,
    name,
    kind,
    defaultUnitPrice,
    defaultQuantity,
    options: extra.options ?? [],
    status: extra.status ?? "active",
    note: extra.note,
    createdAt: CREATED,
    updatedAt: UPDATED,
  };
}

export const mockCatalogueGroups: CatalogueGroup[] = [
  {
    id: "cat-teaching",
    name: "Teaching",
    description: "People in front of the class, and the people supporting them.",
    status: "active",
    createdAt: CREATED,
    updatedAt: UPDATED,
    items: [
      item("cat-teaching", "cat-lecturer", "Lecturer hours", "direct", 1800, 45, {
        note: "Contact hours across a standard term.",
      }),
      item("cat-teaching", "cat-ta", "Teaching assistant", "direct", 600, 30),
      item("cat-teaching", "cat-guest", "Guest lecturer", "direct", 5000, 2, {
        note: "One session, fee inclusive of travel.",
      }),
    ],
  },
  {
    id: "cat-facilities",
    name: "Facilities",
    description: "Rooms and equipment, mostly shared with other courses.",
    status: "active",
    createdAt: CREATED,
    updatedAt: UPDATED,
    items: [
      item("cat-facilities", "cat-room", "Classroom", "indirect", 0, 45, {
        // The option is what makes the unit price zero: an item with options
        // prices itself from the selected one (§12).
        options: [
          { id: "cat-opt-standard", name: "Standard room", unitPrice: 400 },
          {
            id: "cat-opt-lab",
            name: "Computer lab",
            unitPrice: 950,
            note: "Required for practical weeks.",
          },
          {
            id: "cat-opt-studio",
            name: "Design studio",
            unitPrice: 1200,
            note: "Bookable in half days only.",
          },
        ],
      }),
      item("cat-facilities", "cat-equipment", "Equipment hire", "indirect", 8000, 1, {
      }),
      item("cat-facilities", "cat-utilities", "Utilities", "indirect", 12000, 1, {
      }),
      item("cat-facilities", "cat-overhead", "Projector maintenance", "indirect", 3000, 1, {
        // Kept as the worked example of the archive rule: sheets that used it
        // still show where the rate came from (§12a).
        status: "archived",
        note: "Folded into Equipment hire from 2026.",
      }),
    ],
  },
  {
    id: "cat-activities",
    name: "Student activities",
    description: "What the students themselves consume.",
    status: "active",
    createdAt: CREATED,
    updatedAt: UPDATED,
    items: [
      item("cat-activities", "cat-materials", "Course materials", "direct", 350, 40),
      item("cat-activities", "cat-workshop", "Workshop", "indirect", 15000, 1, {
      }),
      item("cat-activities", "cat-field", "Industry visit", "indirect", 18000, 1, {
        note: "Coach shared between courses running the same week.",
      }),
    ],
  },
];

/** Flat lookup, for the seed and for provenance checks. */
export const mockCatalogueItems: CatalogueItem[] = mockCatalogueGroups.flatMap(
  (group) => group.items,
);
