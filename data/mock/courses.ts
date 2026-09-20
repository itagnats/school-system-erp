import type { Course } from "@/types";

/**
 * Fictional courses. Codes follow the specification examples (`IT101`).
 *
 * Hand-written and deliberately few: this file is the readable definition of
 * what a course is. `data/seed/` expands it to the volume the list screens
 * need without anyone having to read four hundred rows.
 */
export const mockCourses: Course[] = [
  {
    id: "crs-it101",
    code: "IT101",
    name: "Introduction to Information Technology",
    description:
      "Foundations of computing: hardware, operating systems, networks and the shape of the modern software stack.",
    credits: 3,
    status: "active",
    offeredIn: ["202501", "202502", "202601", "202602"],
    createdAt: "2025-01-12T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "crs-it205",
    code: "IT205",
    name: "Database Systems",
    description:
      "Relational modeling, normalization, query design and the trade-offs behind indexing.",
    credits: 3,
    status: "active",
    offeredIn: ["202502", "202601"],
    createdAt: "2025-02-03T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "crs-it310",
    code: "IT310",
    name: "Software Engineering Practice",
    description:
      "Working in a team on a real codebase: requirements, review, testing and release.",
    credits: 4,
    status: "active",
    offeredIn: ["202601", "202602"],
    createdAt: "2025-03-18T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "crs-ds220",
    code: "DS220",
    name: "Data Analyzis Fundamentals",
    description:
      "Describing, visualizing and drawing defensible conclusions from a dataset.",
    credits: 3,
    status: "active",
    offeredIn: ["202601"],
    createdAt: "2025-04-02T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "crs-de150",
    code: "DE150",
    name: "Design Thinking",
    description:
      "Framing a problem before solving it, and testing the frame with the people who have it.",
    credits: 2,
    status: "draft",
    offeredIn: [],
    createdAt: "2025-11-20T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "crs-it090",
    code: "IT090",
    name: "Computing Literacy",
    description: "Retired introductory module, replaced by IT101.",
    credits: 2,
    status: "archived",
    offeredIn: ["202501"],
    createdAt: "2024-08-11T09:00:00.000Z",
    updatedAt: "2025-10-30T09:00:00.000Z",
  },
];
