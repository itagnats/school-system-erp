import { mockCostSheets } from "@/data/mock/costs";
import { mockCourses } from "@/data/mock/courses";
import { mockEnrollments } from "@/data/mock/enrollments";
import {
  DEFAULT_GUIDANCE,
  DEFAULT_ROLE_CONFIG,
  NO_TA_CONFIG,
  THREE_SIXTY_ONLY_CONFIG,
  mockEvaluationSetups,
} from "@/data/mock/evaluation";
import {
  PROGRAM_BY_ACADEMIC_NAME,
  PROGRAM_COURSE_PREFIX,
  mockPrograms,
} from "@/data/mock/programs";
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
  EvaluationGroup,
  EvaluationSetup,
  EvaluationWindowStatus,
  Program,
  ProgramEnrollment,
  ProgramTerm,
  ProgramTermStatus,
  RoleConfig,
  Semester,
  SemesterStatus,
  Student,
} from "@/types";
import { EVALUATION_GROUP_LETTERS, evaluationGroupName } from "@/types";
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

/**
 * Course enrollments are derived from programme enrollments, not generated
 * beside them.
 *
 * A student enrols in a programme term, and that enrols them in the courses of
 * its curriculum (direction.md §7a). Generating the two independently was the
 * first attempt and produced a dataset that quietly contradicted itself: barely
 * any programme member was enrolled in their own programme courses, so the
 * per-course head count collapsed, the attributed cost went to almost nothing,
 * and every programme showed a 98% margin. The numbers were arithmetically
 * correct and completely false.
 *
 * A student may still drop an individual course, which is what keeps the
 * per-course head count lower than the programme head count rather than equal
 * to it.
 */
/** One course enrollment for one member of a programme term. */
function buildCourseEnrollment(
  rng: Random,
  serial: number,
  studentId: string,
  courseId: string,
  semesterCode: string,
  statusPool: EnrollmentStatus[],
): Enrollment {
  const enrolledDays = -rng.int(30, 400);
  return {
    id: `enr-${String(serial).padStart(4, "0")}`,
    studentId,
    courseId,
    semesterCode,
    status: rng.pick(statusPool),
    // Group assignment is not decided here. `generateEvaluationGroups` partitions
    // each course-semester and writes the id back, so that a group's members are
    // always students actually enrolled in its course.
    source: rng.pick(ENROLLMENT_SOURCES),
    enrolledAt: isoFromEpoch(enrolledDays),
    updatedAt: isoFromEpoch(enrolledDays + rng.int(1, 40)),
  };
}

function generateEnrollments(
  rng: Random,
  terms: ProgramTerm[],
  programEnrollments: ProgramEnrollment[],
  semesters: Semester[],
): Enrollment[] {
  const enrollments: Enrollment[] = [...mockEnrollments];
  const taken = new Set(
    enrollments.map((e) => `${e.studentId}:${e.courseId}:${e.semesterCode}`),
  );
  const semesterStatus = new Map(semesters.map((s) => [s.code, s.status]));
  const termByKey = new Map(
    terms.map((term) => [`${term.programId}:${term.semesterCode}`, term]),
  );

  const active = programEnrollments.filter((m) => m.status !== "withdrawn");

  let serial = enrollments.length;
  for (const membership of active) {
    const term = termByKey.get(`${membership.programId}:${membership.semesterCode}`);
    if (!term) continue;

    const pool = STATUS_BY_SEMESTER[semesterStatus.get(term.semesterCode) ?? "active"];

    for (const courseId of term.courseIds) {
      const key = `${membership.studentId}:${courseId}:${term.semesterCode}`;
      // Most of the curriculum is taken; a few courses are skipped, so the
      // course head count is a real subset of the programme head count.
      if (taken.has(key) || !rng.chance(0.88)) continue;

      taken.add(key);
      serial += 1;
      enrollments.push(
        buildCourseEnrollment(
          rng,
          serial,
          membership.studentId,
          courseId,
          term.semesterCode,
          pool,
        ),
      );
    }
  }

  return enrollments;
}

const SHEET_STATUSES: CostSheetStatus[] = ["draft", "review", "approved", "approved"];

function generateCostSheets(
  rng: Random,
  courses: Course[],
  enrollments: Enrollment[],
  terms: ProgramTerm[],
): CostSheet[] {
  const sheets: CostSheet[] = [...mockCostSheets];
  const existing = new Set(sheets.map((s) => `${s.courseId}:${s.semesterCode}`));
  const template = mockCostSheets[0];

  const headCount = new Map<string, number>();
  for (const e of enrollments) {
    const key = `${e.courseId}:${e.semesterCode}`;
    headCount.set(key, (headCount.get(key) ?? 0) + 1);
  }

  // A course taught inside a curriculum must have a sheet: the programme profit
  // screen divides by it, and a missing sheet there does not read as an empty
  // state, it reads as a 100% margin.
  const inCurriculum = new Set(
    terms.flatMap((term) => term.courseIds.map((id) => `${id}:${term.semesterCode}`)),
  );

  for (const course of courses) {
    for (const semesterCode of course.offeredIn) {
      const key = `${course.id}:${semesterCode}`;
      if (existing.has(key)) continue;
      // Outside a curriculum, not every offering has a sheet. A dataset where
      // every row is populated never shows what the empty state looks like.
      if (!inCurriculum.has(key) && !rng.chance(0.45)) continue;
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

const TERM_STATUS_BY_SEMESTER: Record<string, ProgramTermStatus> = {
  closed: "closed",
  active: "open",
  upcoming: "planning",
};

/**
 * A programme term is the curriculum for one semester plus its price.
 *
 * Courses are drawn from the matching code prefix, and the price is derived
 * from the course count so a heavier term costs more - an arbitrary price would
 * make the profit screen meaningless.
 */
function generateProgramTerms(
  rng: Random,
  programs: Program[],
  courses: Course[],
  semesters: Semester[],
): ProgramTerm[] {
  const terms: ProgramTerm[] = [];

  for (const program of programs) {
    const prefix = PROGRAM_COURSE_PREFIX[program.id];
    const pool = courses.filter(
      (course) => course.code.startsWith(prefix) && course.status !== "draft",
    );
    if (pool.length === 0) continue;

    for (const semester of semesters) {
      const offered = pool.filter((course) => course.offeredIn.includes(semester.code));
      if (offered.length < 2) continue;

      const curriculum = rng.sample(offered, Math.min(offered.length, rng.int(2, 4)));
      const credits = curriculum.reduce((sum, course) => sum + course.credits, 0);

      terms.push({
        id: `pgt-${program.code.toLowerCase()}-${semester.code}`,
        programId: program.id,
        semesterCode: semester.code,
        courseIds: curriculum.map((course) => course.id),
        // Roughly 4,200 a credit, nudged per term so margins are not identical.
        packagePrice: (credits * 4200 + rng.int(0, 8) * 500),
        currency: "THB",
        status: TERM_STATUS_BY_SEMESTER[semester.status] ?? "planning",
      });
    }
  }

  return terms;
}

const PROGRAM_ENROLLMENT_STATUS: Record<ProgramTermStatus, ProgramEnrollment["status"][]> = {
  closed: ["completed", "completed", "completed", "withdrawn"],
  open: ["active", "active", "active", "pending"],
  planning: ["pending", "pending", "active"],
};

/**
 * Students enrol in a programme, not in a course.
 *
 * Membership follows the programme already on the student profile, so the
 * roster on a programme and the programme on a profile cannot disagree.
 */
function generateProgramEnrollments(
  rng: Random,
  terms: ProgramTerm[],
  students: Student[],
): ProgramEnrollment[] {
  const byProgram = new Map<string, Student[]>();
  for (const student of students) {
    const programId = PROGRAM_BY_ACADEMIC_NAME[student.academic.program];
    if (!programId) continue;
    const list = byProgram.get(programId);
    if (list) list.push(student);
    else byProgram.set(programId, [student]);
  }

  const enrollments: ProgramEnrollment[] = [];
  let serial = 0;

  for (const term of terms) {
    const cohort = byProgram.get(term.programId) ?? [];
    if (cohort.length === 0) continue;

    // Not the whole programme every term: students take breaks, and a term
    // where everyone is enrolled makes the head count meaningless.
    const taking = rng.sample(cohort, Math.max(1, Math.round(cohort.length * 0.55)));
    const pool = PROGRAM_ENROLLMENT_STATUS[term.status];

    for (const student of taking) {
      serial += 1;
      const days = -rng.int(30, 400);
      enrollments.push({
        id: `pen-${String(serial).padStart(4, "0")}`,
        studentId: student.id,
        programId: term.programId,
        semesterCode: term.semesterCode,
        status: rng.pick(pool),
        enrolledAt: isoFromEpoch(days),
        updatedAt: isoFromEpoch(days + rng.int(1, 40)),
      });
    }
  }

  return enrollments;
}

/* -------------------------------------------------------------------------- */
/* Evaluation groups and setups (direction.md §15, §20)                       */
/* -------------------------------------------------------------------------- */

/** Target members per evaluation group. Peer evaluation stops working above this. */
const GROUP_SIZE = 6;

/** Below this, a course-semester is one group rather than two lopsided ones. */
const MIN_GROUP_SIZE = 4;

/** Enrolments that actually take part. A dropped student is not evaluated. */
const EVALUABLE: ReadonlySet<EnrollmentStatus> = new Set<EnrollmentStatus>([
  "enrolled",
  "active",
  "completed",
]);

/**
 * Partition each course-semester into evaluation groups, and write the group id
 * back onto the enrollments.
 *
 * The group id has to be derived from the enrollments rather than assigned
 * independently, for the reason recorded above `buildCourseEnrollment`: the
 * programme layer was first built with two independent generators and produced
 * a dataset that contradicted itself. A group whose members are not enrolled in
 * its course is the same mistake wearing different clothes - peer evaluation
 * would have nobody to evaluate.
 *
 * Returns the enrollments as well as the groups, because assignment is a
 * property of the enrollment and the two have to agree.
 */
function generateEvaluationGroups(
  rng: Random,
  enrollments: Enrollment[],
): { groups: EvaluationGroup[]; enrollments: Enrollment[] } {
  const byScope = new Map<string, Enrollment[]>();
  for (const enrollment of enrollments) {
    if (!EVALUABLE.has(enrollment.status)) continue;
    const key = `${enrollment.courseId}:${enrollment.semesterCode}`;
    const bucket = byScope.get(key);
    if (bucket) bucket.push(enrollment);
    else byScope.set(key, [enrollment]);
  }

  const groups: EvaluationGroup[] = [];
  /** enrollment id -> group id, applied in one pass at the end. */
  const assignment = new Map<string, string>();

  // Sorted, so the dataset does not depend on Map insertion order.
  for (const key of [...byScope.keys()].sort()) {
    const cohort = byScope.get(key) ?? [];
    if (cohort.length < MIN_GROUP_SIZE) continue;

    const [courseId, semesterCode] = key.split(":");
    for (const group of partitionCohort(rng, courseId, semesterCode, cohort)) {
      for (const member of group.memberEnrollmentIds) assignment.set(member, group.id);
      groups.push(group);
    }
  }

  return {
    groups,
    enrollments: enrollments.map((enrollment) => {
      const groupId = assignment.get(enrollment.id);
      return groupId ? { ...enrollment, evaluationGroupId: groupId } : enrollment;
    }),
  };
}

/**
 * Split one course-semester cohort into evenly sized groups.
 *
 * Two details are deliberate. A few members are left out, so the "ungrouped"
 * warning on Manage Evaluation has something real to report rather than always
 * reading zero. And the remainder is spread across the leading groups rather
 * than piling up at the end: 21 members become 6/5/5/5, not 6/6/6/3, because a
 * trailing group of three is too thin for peer evaluation to mean anything.
 */
function partitionCohort(
  rng: Random,
  courseId: string,
  semesterCode: string,
  cohort: Enrollment[],
): EvaluationGroup[] {
  const ordered = [...cohort].sort((a, b) => a.id.localeCompare(b.id));
  const ungrouped = rng.chance(0.25) ? rng.int(1, 3) : 0;
  const groupable = ordered.slice(0, Math.max(MIN_GROUP_SIZE, ordered.length - ungrouped));

  const groupCount = Math.max(
    1,
    Math.min(EVALUATION_GROUP_LETTERS.length, Math.round(groupable.length / GROUP_SIZE) || 1),
  );
  const shortSuffix = courseId.replace(/^crs-/, "");
  const base = Math.floor(groupable.length / groupCount);
  const remainder = groupable.length % groupCount;

  const groups: EvaluationGroup[] = [];
  let cursor = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const letter = EVALUATION_GROUP_LETTERS[index];
    const size = base + (index < remainder ? 1 : 0);
    const members = groupable.slice(cursor, cursor + size);
    cursor += size;
    if (members.length === 0) continue;

    groups.push({
      id: `grp-${shortSuffix}-${semesterCode}-${letter.toLowerCase()}`,
      name: evaluationGroupName(letter),
      courseId,
      semesterCode: semesterCode as Semester["code"],
      memberEnrollmentIds: members.map((member) => member.id),
    });
  }
  return groups;
}

/**
 * One evaluation setup per course-semester that has groups.
 *
 * A course-semester with no groups gets no setup, which is what puts genuine
 * gaps in the table: an administrator opening Manage Evaluation should see
 * which cohorts are not set up yet, not a fully configured world.
 *
 * The window status follows the semester rather than being chosen freely - an
 * archived semester cannot have a draft evaluation - and the blend is varied
 * across setups so that every readiness state appears somewhere in the list.
 */
function generateEvaluationSetups(
  rng: Random,
  groups: EvaluationGroup[],
  courses: Course[],
  semesters: Semester[],
): EvaluationSetup[] {
  const setups: EvaluationSetup[] = [...mockEvaluationSetups];
  const taken = new Set(setups.map((setup) => `${setup.courseId}:${setup.semesterCode}`));
  const courseByCode = new Map(courses.map((course) => [course.id, course]));
  const semesterStatus = new Map(semesters.map((semester) => [semester.code, semester.status]));

  const scopes = [...new Set(groups.map((group) => `${group.courseId}:${group.semesterCode}`))]
    .sort();

  for (const scope of scopes) {
    if (taken.has(scope)) continue;
    const [courseId, semesterCode] = scope.split(":");
    const course = courseByCode.get(courseId);
    if (!course) continue;

    // Not every grouped cohort is set up. The gap is the point.
    if (rng.chance(0.18)) continue;

    const status = windowStatusFor(rng, semesterStatus.get(semesterCode as Semester["code"]));
    const roles = pickBlend(rng);

    const opensDays = rng.int(20, 200);
    setups.push({
      id: `evs-${courseId.replace(/^crs-/, "")}-${semesterCode}`,
      courseId,
      semesterCode: semesterCode as Semester["code"],
      name: `${course.code} 360 Evaluation ${semesterCode}`,
      shortName: `${course.code}-EV${semesterCode.slice(-1)}`,
      status,
      // Editing is frozen from the moment evaluators can submit.
      editingLocked: status !== "draft",
      opensOn: isoFromEpoch(opensDays),
      closesOn: isoFromEpoch(opensDays + 25),
      reportDate: isoFromEpoch(opensDays + 32),
      scaleMax: 5,
      guidance: DEFAULT_GUIDANCE,
      roles: roles.map((role) => ({ ...role, criteria: [...role.criteria] })),
    });
  }

  return setups;
}

/**
 * Vary the blend across setups so every readiness state appears in the list.
 *
 * A 360-only blend is what produces the "not used" mark on the ranking
 * column, and a blend with no TA is what makes the disabled-role case visible
 * without an administrator having to build it by hand.
 */
function pickBlend(rng: Random): readonly RoleConfig[] {
  if (rng.chance(0.2)) return THREE_SIXTY_ONLY_CONFIG;
  if (rng.chance(0.15)) return NO_TA_CONFIG;
  return DEFAULT_ROLE_CONFIG;
}

/**
 * An evaluation window cannot run ahead of the semester it belongs to.
 *
 * The statuses here are the three a Semester actually has. An earlier version
 * tested for "archived" and "completed", which the semester type has never
 * used, so every branch fell through and thirty of forty-one setups came out as
 * drafts - a table where almost nothing was configured.
 */
function windowStatusFor(rng: Random, semesterStatus?: SemesterStatus): EvaluationWindowStatus {
  if (semesterStatus === "closed") {
    return rng.chance(0.75) ? "published" : "closed";
  }
  if (semesterStatus === "active") {
    return rng.pick<EvaluationWindowStatus>(["open", "open", "open", "closed", "draft"]);
  }
  return "draft";
}

export interface Dataset {
  semesters: Semester[];
  courses: Course[];
  students: Student[];
  enrollments: Enrollment[];
  costSheets: CostSheet[];
  programs: Program[];
  programTerms: ProgramTerm[];
  programEnrollments: ProgramEnrollment[];
  evaluationGroups: EvaluationGroup[];
  evaluationSetups: EvaluationSetup[];
}

/** Fixed seed. Changing it changes every generated row. */
const SEED = 20260105;

export function generateDataset(): Dataset {
  const rng = createRandom(SEED);
  const semesters = [...mockSemesters];
  const courses = generateCourses(rng, semesters);
  const students = generateStudents(rng);
  // Order matters: a course enrollment is a consequence of a programme
  // enrollment, so the programme layer has to exist first.
  const programs = [...mockPrograms];
  const programTerms = generateProgramTerms(rng, programs, courses, semesters);
  const programEnrollments = generateProgramEnrollments(rng, programTerms, students);
  const rawEnrollments = generateEnrollments(rng, programTerms, programEnrollments, semesters);
  // Groups are a partition of the enrollments and hand the group id back, so
  // this rebinds rather than producing a second, disagreeing list.
  const grouped = generateEvaluationGroups(rng, rawEnrollments);
  const enrollments = grouped.enrollments;
  const evaluationGroups = grouped.groups;
  const evaluationSetups = generateEvaluationSetups(rng, evaluationGroups, courses, semesters);
  const costSheets = generateCostSheets(rng, courses, enrollments, programTerms);

  return {
    semesters,
    courses,
    students,
    enrollments,
    costSheets,
    programs,
    programTerms,
    programEnrollments,
    evaluationGroups,
    evaluationSetups,
  };
}
