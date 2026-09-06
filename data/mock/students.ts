import type { Student } from "@/types";

/**
 * Fictional students. Identifiers follow the specification examples
 * (`ST-2026-001`), and every name, address and interest here is invented.
 *
 * Two full profiles are written out so the shape of `Student` is readable in
 * one place; `data/seed/` generates the rest.
 */
export const mockStudents: Student[] = [
  {
    id: "stu-001",
    studentId: "ST-2026-001",
    personal: {
      firstName: "Student",
      lastName: "001",
      dateOfBirth: "2006-03-14",
      email: "student001@example.edu",
      phone: "+66 2 000 0001",
    },
    academic: {
      program: "Information Technology",
      major: "Software Engineering",
      yearLevel: 2,
      interests: ["Web development", "Accessibility"],
      skills: ["TypeScript", "SQL", "Figma"],
      certifications: ["Intro to Cloud Practitioner"],
    },
    experience: {
      projects: [
        {
          id: "prj-001",
          title: "Campus wayfinding app",
          description: "A route finder for the main campus, built with a small team.",
          startDate: "2025-08-01",
          endDate: "2025-11-30",
        },
      ],
      clubs: [
        { id: "clb-001", title: "Developer Circle", startDate: "2025-06-01" },
      ],
      activities: [
        { id: "act-001", title: "Open day volunteer", startDate: "2025-09-12" },
      ],
      achievements: [
        { id: "ach-001", title: "Best first-year project", startDate: "2025-12-05" },
      ],
      careerGoal: "Front-end engineer working on public-sector services.",
    },
    emergencyContact: {
      name: "Guardian 001",
      relationship: "Parent",
      phone: "+66 2 000 1001",
    },
    createdAt: "2025-06-01T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "stu-002",
    studentId: "ST-2026-002",
    personal: {
      firstName: "Student",
      lastName: "002",
      dateOfBirth: "2005-11-02",
      email: "student002@example.edu",
    },
    academic: {
      program: "Data Science",
      major: "Applied Statistics",
      yearLevel: 3,
      interests: ["Visualisation", "Forecasting"],
      skills: ["Python", "R", "SQL"],
      certifications: [],
    },
    experience: {
      projects: [],
      clubs: [{ id: "clb-002", title: "Data Society", startDate: "2024-06-01" }],
      activities: [],
      achievements: [],
      careerGoal: "Analytics for a research institute.",
    },
    createdAt: "2024-06-01T09:00:00.000Z",
    updatedAt: "2026-01-05T09:00:00.000Z",
  },
];
