import type { Enrollment } from "@/types";

/**
 * Fictional enrollments. An enrollment joins a student to a course in one
 * semester and is what every downstream record hangs off (direction.md §8).
 */
export const mockEnrollments: Enrollment[] = [
  {
    id: "enr-0001",
    studentId: "stu-001",
    courseId: "crs-it101",
    semesterCode: "202601",
    status: "active",
    evaluationGroupId: "grp-a",
    source: "existing-profile",
    enrolledAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  },
  {
    id: "enr-0002",
    studentId: "stu-002",
    courseId: "crs-it101",
    semesterCode: "202601",
    status: "active",
    evaluationGroupId: "grp-a",
    source: "previous-course",
    enrolledAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  },
];
