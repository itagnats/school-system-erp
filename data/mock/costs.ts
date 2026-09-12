import type { CostSheet } from "@/types";

/**
 * One fully written cost sheet, so the nesting is readable in a single file:
 *
 *   Cost Sheet -> Cost Group -> Cost Item -> Cost Option
 *
 * A direct item belongs wholly to this course and carries allocation 100. A
 * shared item is incurred across several courses and reaches this sheet through
 * a lower allocation percentage (direction.md §11-13).
 */
export const mockCostSheets: CostSheet[] = [
  {
    id: "cst-it101-202601",
    courseId: "crs-it101",
    semesterCode: "202601",
    status: "approved",
    markupPercent: 5,
    studentCount: 42,
    currency: "THB",
    groups: [
      {
        id: "grp-teaching",
        name: "Teaching",
        catalogueGroupId: "cat-teaching",
        items: [
          {
            id: "itm-lecturer",
            name: "Lecturer hours",
            kind: "direct",
            unitPrice: 1800,
            quantity: 45,
            allocationPercent: 100,
            options: [],
            note: "45 contact hours across the term.",
            catalogueItemId: "cat-lecturer",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
          {
            id: "itm-ta",
            name: "Teaching assistant",
            kind: "direct",
            // Deliberately above the catalogue default of 600, so this sheet
            // demonstrates the "differs from the catalogue" state (§12a).
            unitPrice: 750,
            quantity: 30,
            allocationPercent: 100,
            options: [],
            catalogueItemId: "cat-ta",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
        ],
      },
      {
        id: "grp-facilities",
        name: "Facilities",
        catalogueGroupId: "cat-facilities",
        items: [
          {
            id: "itm-room",
            name: "Classroom",
            kind: "shared",
            unitPrice: 0,
            quantity: 45,
            allocationPercent: 35,
            catalogueItemId: "cat-room",
            copiedAt: "2025-12-02T09:00:00.000Z",
            selectedOptionId: "opt-lab",
            options: [
              { id: "opt-standard", name: "Standard room", unitPrice: 400 },
              {
                id: "opt-lab",
                name: "Computer lab",
                unitPrice: 950,
                note: "Required for the practical weeks.",
              },
            ],
          },
          {
            id: "itm-utilities",
            name: "Utilities",
            kind: "shared",
            unitPrice: 12000,
            quantity: 1,
            allocationPercent: 20,
            options: [],
            catalogueItemId: "cat-utilities",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
        ],
      },
      {
        id: "grp-activities",
        name: "Student activities",
        catalogueGroupId: "cat-activities",
        items: [
          {
            id: "itm-materials",
            name: "Course materials",
            kind: "direct",
            unitPrice: 350,
            quantity: 42,
            allocationPercent: 100,
            options: [],
            catalogueItemId: "cat-materials",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
          {
            id: "itm-field",
            name: "Industry visit",
            kind: "shared",
            unitPrice: 18000,
            quantity: 1,
            allocationPercent: 50,
            options: [],
            note: "Coach shared with DS220.",
            catalogueItemId: "cat-field",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
          {
            // No catalogue origin: a one-off cost typed straight onto the
            // sheet, which §12a allows and never reports as out of date.
            id: "itm-invigilation",
            name: "External invigilator",
            kind: "direct",
            unitPrice: 2400,
            quantity: 2,
            allocationPercent: 100,
            options: [],
            note: "Required for the practical assessment only.",
          },
        ],
      },
    ],
    createdAt: "2026-04-10T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
];
