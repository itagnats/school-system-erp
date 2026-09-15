import { DEFAULT_PRICE_ROUNDING_STEP } from "@/lib/calculations/cost";
import type { CourseCostSheet, ProgramCostSheet } from "@/types";

/**
 * One of each sheet, fully written, so the nesting is readable in a single file:
 *
 *   Course Cost Sheet     -> Cost Group -> Cost Item -> Cost Option   (direct)
 *   Programme Cost Sheet  -> Cost Group -> Cost Item -> Cost Option   (indirect)
 *
 * The pair is deliberately the same course-semester and the programme term that
 * contains it, so a reader can see how the two halves meet: IT101 carries its
 * own lecturer and materials, and takes a share of the BSc IT programme's
 * classroom and utilities (direction.md §11-13).
 *
 * Nothing here carries an allocation percentage. A course bears its direct
 * costs whole, and a share of the indirect pool is derived from the driver.
 */
export const mockCourseCostSheets: CourseCostSheet[] = [
  {
    id: "cst-it101-202601",
    courseId: "crs-it101",
    semesterCode: "202601",
    status: "approved",
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
            options: [],
            catalogueItemId: "cat-ta",
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
            options: [],
            catalogueItemId: "cat-materials",
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

/**
 * The programme term that IT101 sits in, and the costs it bears once.
 *
 * The classroom is the worked example of why this sheet exists at all. It is
 * booked by the programme, not by any one course: under the old model each
 * course held its own copy and took whatever percentage someone typed, and
 * across the seed 82 of 92 pools recovered less than the cost.
 */
export const mockProgramCostSheets: ProgramCostSheet[] = [
  {
    id: "pcs-bsc-it-202601",
    programTermId: "pgt-bsc-it-202601",
    semesterCode: "202601",
    status: "approved",
    driver: "credits",
    markupPercent: 5,
    priceRoundingStep: DEFAULT_PRICE_ROUNDING_STEP,
    currency: "THB",
    groups: [
      {
        id: "grp-facilities",
        name: "Facilities",
        catalogueGroupId: "cat-facilities",
        items: [
          {
            id: "itm-room",
            name: "Classroom",
            kind: "indirect",
            unitPrice: 0,
            quantity: 45,
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
            kind: "indirect",
            unitPrice: 12000,
            quantity: 1,
            options: [],
            catalogueItemId: "cat-utilities",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
        ],
      },
      {
        id: "grp-activities-indirect",
        name: "Student activities",
        catalogueGroupId: "cat-activities",
        items: [
          {
            id: "itm-field",
            name: "Industry visit",
            kind: "indirect",
            unitPrice: 18000,
            quantity: 1,
            options: [],
            note: "One coach for the whole cohort.",
            catalogueItemId: "cat-field",
            copiedAt: "2025-12-02T09:00:00.000Z",
          },
        ],
      },
    ],
    createdAt: "2026-04-10T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
];
