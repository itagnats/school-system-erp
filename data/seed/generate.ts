import { mockCostSheets } from "@/data/mock/costs";
import { mockCourses } from "@/data/mock/courses";
import { mockEnrollments } from "@/data/mock/enrollments";
import { mockSemesters } from "@/data/mock/semesters";
import { mockStudents } from "@/data/mock/students";
import type {
  CostSheet,
  CostSheetStatus,
  Course,
  CourseStatus,
  Enrollment,
  EnrollmentSource,
  EnrollmentStatus,
  Semester,
  Student,
} from "@/types";
import { createRandom, isoFromEpoch, type Random } from "./random";

/**
 * Expands the hand-written fixtures to the volume the list screens need.
 *
 * Everything here derives from a fixed seed, never from `Math.random()` or the
 * clock: the same dataset must come out of every process and every build, or
 * the server and client renders disagree and hydration breaks.
 *
 * The hand-written rows come first and keep their ids, so a reader who has read
 * `data/mock/` recognises the top of every list.
 */

const SUBJECTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    "IT",
    [
      "Networks and Protocols",
      "Operating Systems",
      "Web Systems",
      "Cloud Foundations",
      "Cyber Security Basics",
      "Mobile Development",
      "Systems Analysis",
      "IT Project Management",
    ],
  ],
  [
    "DS",
    [
      "Statistics for Analysts",
      "Data Visualisation",
      "Machine Learning Primer",
      "Data Ethics",
      "Experiment Design",
    ],
  ],
  ["DE", ["Interaction Design", "Typography", "Service Design", "Prototyping"]],
  ["BA", ["Operations Research", "Decision Modelling", "Process Improvement"]],
  [
    "CS",
    [
      "Algorithms",
      "Discrete Mathematics",
      "Compilers",
      "Distributed Systems",
      "Programming Paradigms",
    ],
  ],
];

const PROGRAMS = [
  "Information Technology",
  "Data Science",
  "Computer Science",
  "Business Analytics",
  "Design",
] as const;

const MAJORS = [
  "Software Engineering",
  "Applied Statistics",
  "Human-Computer Interaction",
  "Information Systems",
  "Network Engineering",
] as const;

const INTERESTS = [
  "Web development",
  "Accessibility",
  "Visualisation",
  "Robotics",
  "Game design",
  "Forecasting",
  "Open source",
  "Cyber security",
];

const SKILLS = ["TypeScript", "Python", "SQL", "Figma", "Go", "R", "Kubernetes", "Testing"];

// Weighted by repetition: most courses are active, a few are not.
const COURSE_STATUSES: CourseStatus[] = ["active", "active", "active", "draft", "archived"];

const ENROLLMENT_SOURCES: EnrollmentSource[] = [
  "existing-profile",
  "previous-course",
  "new-student",
];

const CLUBS = ["Developer Circle", "Data Society", "Design Studio"];
const RELATIONSHIPS = ["Parent", "Sibling", "Guardian"];

function generateCourses(rng: Random, semesters: Semester[]): Course[] {
  const courses: Course[] = [...mockCourses];
  const used = new Set(courses.map((c) => c.code));
  const offerable = semesters.map((s) => s.code);

  for (const [prefix, titles] of SUBJECTS) {
    for (const title of titles) {
      const level = rng.int(1, 4) * 100 + rng.int(0, 9) * 10 + rng.int(0, 9);
      const code = `${prefix}${level}`;
      if (used.has(code)) continue;
      used.add(code);

      const status = rng.pick(COURSE_STATUSES);
      const createdDays = -rng.int(120, 600);
      courses.push({
        id: `crs-${code.toLowerCase()}`,
        code,
        name: title,
        description: `${title} for the ${prefix} programme. A fictional course record used for demonstration.`,
        credits: rng.int(2, 4),
        status,
        // A draft course has not been scheduled yet, which is what makes the
        // status meaningful rather than decorative.
        offeredIn:
          status === "draft"
            ? []
            : rng.sample(offerable, rng.int(1, offerable.length)).sort((a, b) => a.localeCompare(b)),
        createdAt: isoFromEpoch(createdDays),
        updatedAt: isoFromEpoch(createdDays + rng.int(10, 100)),
      });
    }
  }

  return courses.sort((a, b) => a.code.localeCompare(b.code));
}

function generateStudents(rng: Random): Student[] {
  const students: Student[] = [...mockStudents];

  for (let n = students.length + 1; n <= 300; n++) {
    const serial = String(n).padStart(3, "0");
    const createdDays = -rng.int(60, 700);
    const month = String(rng.int(1, 12)).padStart(2, "0");
    const day = String(rng.int(1, 28)).padStart(2, "0");

    students.push({
      id: `stu-${serial}`,
      studentId: `ST-2026-${serial}`,
      personal: {
        firstName: "Student",
        lastName: serial,
        dateOfBirth: `200${rng.int(4, 7)}-${month}-${day}`,
        email: `student${serial}@example.edu`,
        phone: rng.chance(0.6) ? `+66 2 000 ${serial}` : undefined,
      },
      academic: {
        program: rng.pick(PROGRAMS),
        major: rng.pick(MAJORS),
        yearLevel: rng.int(1, 4),
        interests: rng.sample(INTERESTS, rng.int(1, 3)),
        skills: rng.sample(SKILLS, rng.int(1, 4)),
        certifications: rng.chance(0.3) ? ["Intro to Cloud Practitioner"] : [],
      },
      experience: {
        projects: rng.chance(0.5)
          ? [
              {
                id: `prj-${serial}`,
                title: "Team project",
                description: "A group assignment delivered during the term.",
                startDate: isoFromEpoch(-rng.int(100, 300)).slice(0, 10),
              },
            ]
          : [],
        clubs: rng.chance(0.4) ? [{ id: `clb-${serial}`, title: rng.pick(CLUBS) }] : [],
        activities: [],
        achievements: rng.chance(0.2)
          ? [{ id: `ach-${serial}`, title: "Faculty commendation" }]
          : [],
        careerGoal: rng.chance(0.5) ? "Working in industry after graduation." : undefined,
      },
      emergencyContact: rng.chance(0.7)
        ? {
            name: `Guardian ${serial}`,
            relationship: rng.pick(RELATIONSHIPS),
            phone: `+66 2 000 1${serial}`,
          }
        : undefined,
      createdAt: isoFromEpoch(createdDays),
      updatedAt: isoFromEpoch(createdDays + rng.int(5, 60)),
    });
  }

  return students;
}

/**
 * Enrollment status follows the semester it belongs to: a closed semester
 * cannot hold pending enrollments, and an upcoming one cannot hold completed
 * ones. Without this the status filter returns nonsense combinations.
 */
const STATUS_BY_SEMESTER: Record<string, EnrollmentStatus[]> = {
  closed: ["completed", "completed", "completed", "dropped"],
  active: ["active", "active", "active", "enrolled", "dropped"],
  upcoming: ["pending", "pending", "enrolled", "cancelled"],
};

function generateEnrollments(
  rng: Random,
  courses: Course[],
  students: Student[],
  semesters: Semester[],
): Enrollment[] {
  const enrollments: Enrollment[] = [...mockEnrollments];
  const taken = new Set(
    enrollments.map((e) => `${e.studentId}:${e.courseId}:${e.semesterCode}`),
  );
  const semesterStatus = new Map(semesters.map((s) => [s.code, s.status]));
  const runnable = courses.filter((c) => c.offeredIn.length > 0);

  let serial = enrollments.length;
  for (const course of runnable) {
    for (const semesterCode of course.offeredIn) {
      const cohort = rng.sample(students, rng.int(12, 34));
      for (const student of cohort) {
        const key = `${student.id}:${course.id}:${semesterCode}`;
        if (taken.has(key)) continue;
        taken.add(key);
        serial += 1;

        const pool = STATUS_BY_SEMESTER[semesterStatus.get(semesterCode) ?? "active"];
        const enrolledDays = -rng.int(30, 400);
        enrollments.push({
          id: `enr-${String(serial).padStart(4, "0")}`,
          studentId: student.id,
          courseId: course.id,
          semesterCode,
          status: rng.pick(pool),
          evaluationGroupId: rng.chance(0.6)
            ? `grp-${rng.pick(["a", "b", "c", "d"])}`
            : undefined,
          source: rng.pick(ENROLLMENT_SOURCES),
          enrolledAt: isoFromEpoch(enrolledDays),
          updatedAt: isoFromEpoch(enrolledDays + rng.int(1, 40)),
        });
      }
    }
  }

  return enrollments;
}

const SHEET_STATUSES: CostSheetStatus[] = ["draft", "review", "approved", "approved"];

function generateCostSheets(
  rng: Random,
  courses: Course[],
  enrollments: Enrollment[],
): CostSheet[] {
  const sheets: CostSheet[] = [...mockCostSheets];
  const existing = new Set(sheets.map((s) => `${s.courseId}:${s.semesterCode}`));
  const template = mockCostSheets[0];

  const headCount = new Map<string, number>();
  for (const e of enrollments) {
    const key = `${e.courseId}:${e.semesterCode}`;
    headCount.set(key, (headCount.get(key) ?? 0) + 1);
  }

  for (const course of courses) {
    for (const semesterCode of course.offeredIn) {
      const key = `${course.id}:${semesterCode}`;
      if (existing.has(key)) continue;
      // Not every offering has a sheet. A dataset where every row is populated
      // never shows what the empty state looks like.
      if (!rng.chance(0.55)) continue;
      existing.add(key);

      const createdDays = -rng.int(40, 300);
      sheets.push({
        id: `cst-${course.code.toLowerCase()}-${semesterCode}`,
        courseId: course.id,
        semesterCode,
        status: rng.pick(SHEET_STATUSES),
        markupPercent: rng.pick([0, 0, 5, 8, 10]),
        studentCount: headCount.get(key) ?? rng.int(15, 40),
        currency: "THB",
        groups: template.groups.map((group) => ({
          ...group,
          id: `${group.id}-${semesterCode}`,
          items: group.items.map((item) => ({
            ...item,
            id: `${item.id}-${semesterCode}`,
            quantity: Math.max(1, Math.round(item.quantity * (0.7 + rng.next() * 0.6))),
            allocationPercent:
              item.kind === "direct" ? 100 : rng.pick([15, 20, 25, 35, 50]),
            options: item.options.map((option) => ({
              ...option,
              id: `${option.id}-${semesterCode}`,
            })),
            selectedOptionId: item.selectedOptionId
              ? `${item.selectedOptionId}-${semesterCode}`
              : undefined,
          })),
        })),
        createdAt: isoFromEpoch(createdDays),
        updatedAt: isoFromEpoch(createdDays + rng.int(5, 60)),
      });
    }
  }

  return sheets;
}

export interface Dataset {
  semesters: Semester[];
  courses: Course[];
  students: Student[];
  enrollments: Enrollment[];
  costSheets: CostSheet[];
}

/** Fixed seed. Changing it changes every generated row. */
const SEED = 20260105;

export function generateDataset(): Dataset {
  const rng = createRandom(SEED);
  const semesters = [...mockSemesters];
  const courses = generateCourses(rng, semesters);
  const students = generateStudents(rng);
  const enrollments = generateEnrollments(rng, courses, students, semesters);
  const costSheets = generateCostSheets(rng, courses, enrollments);
  return { semesters, courses, students, enrollments, costSheets };
}
