import type { Program } from "@/types";

/**
 * Fictional programmes.
 *
 * The code prefix is load-bearing in the seed: a programme is stocked with the
 * courses whose code starts with the same letters, so `BSC-IT` gets the `IT`
 * courses. Real curriculum design is not that tidy, but a demo where the course
 * list is arbitrary teaches the reader nothing about the model.
 */
export const mockPrograms: Program[] = [
  {
    id: "prg-it",
    code: "BSC-IT",
    name: "Information Technology",
    description:
      "Four-year programme covering infrastructure, software delivery and information systems.",
    credential: "Bachelor of Science",
    status: "active",
    createdAt: "2024-09-01T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "prg-ds",
    code: "BSC-DS",
    name: "Data Science",
    description: "Statistics, modelling and the ethics of drawing conclusions from data.",
    credential: "Bachelor of Science",
    status: "active",
    createdAt: "2024-09-01T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "prg-cs",
    code: "BSC-CS",
    name: "Computer Science",
    description: "Algorithms, systems and the theory underneath both.",
    credential: "Bachelor of Science",
    status: "active",
    createdAt: "2024-09-01T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "prg-ba",
    code: "BBA-AN",
    name: "Business Analytics",
    description: "Decision modelling and process improvement for operations teams.",
    credential: "Bachelor of Business Administration",
    status: "active",
    createdAt: "2025-01-15T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "prg-de",
    code: "BFA-DE",
    name: "Design",
    description: "Interaction and service design, taught through studio practice.",
    credential: "Bachelor of Fine Arts",
    status: "draft",
    createdAt: "2025-11-20T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
];

/** Which course code prefix stocks each programme, used by the seed. */
export const PROGRAM_COURSE_PREFIX: Record<string, string> = {
  "prg-it": "IT",
  "prg-ds": "DS",
  "prg-cs": "CS",
  "prg-ba": "BA",
  "prg-de": "DE",
};
