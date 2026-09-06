import type { Semester } from "@/types";

/**
 * Fictional semesters. Codes are `YYYYNN` (direction.md §5), so `202602` is the
 * second term of academic year 2026.
 *
 * Small and hand-written on purpose: a reader should be able to take in the
 * whole semester model from this one file. Volume lives in `data/seed/`.
 */
export const mockSemesters: Semester[] = [
  {
    id: "sem-202501",
    code: "202501",
    name: "First Semester 2025",
    academicYear: 2025,
    term: 1,
    startDate: "2025-06-02",
    endDate: "2025-10-10",
    status: "closed",
  },
  {
    id: "sem-202502",
    code: "202502",
    name: "Second Semester 2025",
    academicYear: 2025,
    term: 2,
    startDate: "2025-11-03",
    endDate: "2026-03-13",
    status: "closed",
  },
  {
    id: "sem-202601",
    code: "202601",
    name: "First Semester 2026",
    academicYear: 2026,
    term: 1,
    startDate: "2026-06-01",
    endDate: "2026-10-09",
    status: "active",
  },
  {
    id: "sem-202602",
    code: "202602",
    name: "Second Semester 2026",
    academicYear: 2026,
    term: 2,
    startDate: "2026-11-02",
    endDate: "2027-03-12",
    status: "upcoming",
  },
];

export const SEMESTER_CODES = mockSemesters.map((s) => s.code);
