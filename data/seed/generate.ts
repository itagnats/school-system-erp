import { mockCatalogueGroups } from "@/data/mock/cost-catalog";
import { mockCourseCostSheets, mockProgramCostSheets } from "@/data/mock/costs";
import { mockCourses } from "@/data/mock/courses";
import { mockEnrollments } from "@/data/mock/enrollments";
import {
  DEFAULT_ASSESSEES,
  DEFAULT_GUIDANCE,
  NO_TA_ASSESSEES,
  STUDENT_ONLY_ASSESSEES,
  cloneAssessees,
  mockEvaluationSetups,
} from "@/data/mock/evaluation";
import {
  DRAFT_ONLY_TERM_STATUS,
  INVOICE_STATUS_BY_MEMBERSHIP,
  ISSUE_LEAD_DAYS,
  PAYMENT_TERM_DAYS,
  PROGRAMME_FEE_LABEL,
} from "@/data/mock/invoices";
import {
  PROGRAM_BY_ACADEMIC_NAME,
  PROGRAM_COURSE_PREFIX,
  mockPrograms,
} from "@/data/mock/programs";
import { mockSemesters } from "@/data/mock/semesters";
import { mockStudents } from "@/data/mock/students";
import type {
  AssesseeConfig,
  CatalogueGroup,
  CatalogueItem,
  CostGroup,
  CostItem,
  CostKind,
  CostSheetStatus,
  CourseCostSheet,
  Course,
  CourseStatus,
  Enrollment,
  EnrollmentSource,
  EnrollmentStatus,
  EvaluationGroup,
  EvaluationSetup,
  EvaluationWindowStatus,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Program,
  ProgramCostSheet,
  ProgramEnrollment,
  ProgramTerm,
  ProgramTermStatus,
  Semester,
  SemesterStatus,
  Student,
} from "@/types";
import { EVALUATION_GROUP_LETTERS, evaluationGroupName } from "@/types";
import { DEFAULT_PRICE_ROUNDING_STEP } from "@/lib/calculations/cost";
import {
  CREDIT_PERCENT,
  CREDIT_RATE,
  courseLineAmount,
  creditLineAmount,
  creditReasonFor,
  programmeFeeAmount,
} from "@/lib/calculations/invoice";
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

/**
 * How often a sheet's copy is nudged away from the catalogue default.
 *
 * Not variety for its own sake: §12a says a sheet owns its copy and the
 * catalogue does not reach back into it, so the dataset has to contain items
 * that genuinely differ or the drift states can never be seen on screen.
 */
const PRICE_DRIFT_CHANCE = 0.18;

/** Copy one catalogue item onto a sheet, taking its defaults (§12a). */
function copyFromCatalogue(
  rng: Random,
  source: CatalogueItem,
  suffix: string,
): CostItem {
  const drifted = rng.chance(PRICE_DRIFT_CHANCE);

  return {
    id: `${source.id}-${suffix}`,
    name: source.name,
    kind: source.kind,
    // A sheet that has moved its own price is the case the drift report exists
    // for. The rest sit exactly on the catalogue.
    unitPrice: drifted
      ? Math.round((source.defaultUnitPrice * (0.85 + rng.next() * 0.4)) / 50) * 50
      : source.defaultUnitPrice,
    quantity: Math.max(1, Math.round(source.defaultQuantity * (0.7 + rng.next() * 0.6))),
    options: source.options.map((option) => ({
      ...option,
      id: `${option.id}-${suffix}`,
    })),
    selectedOptionId:
      source.options.length > 0
        ? `${rng.pick(source.options).id}-${suffix}`
        : undefined,
    note: source.note,
    catalogueItemId: source.id,
    copiedAt: isoFromEpoch(-rng.int(40, 300)),
  };
}

/**
 * The groups one sheet is built from.
 *
 * Two to three of the catalogue's active groups, each contributing most of its
 * active items. Not all of them: a sheet that always contains everything makes
 * the "add from catalogue" action look like it has nothing left to add.
 */
/**
 * Groups for one sheet, drawn from the catalogue and filtered by kind.
 *
 * `kind` is the whole point: a course sheet may only take direct items and a
 * programme sheet only indirect ones (direction.md §12). Filtering here rather
 * than at the call sites is what makes it impossible for the generator to
 * produce a sheet the application would refuse to accept.
 */
function sheetGroupsFrom(
  rng: Random,
  catalogue: CatalogueGroup[],
  suffix: string,
  kind: CostKind,
): CostGroup[] {
  const usable = catalogue
    .filter((group) => group.status === "active")
    .map((group) => ({
      group,
      available: group.items.filter(
        (entry) => entry.status === "active" && entry.kind === kind,
      ),
    }))
    .filter((entry) => entry.available.length > 0);

  const chosen = rng.sample(usable, Math.min(usable.length, rng.int(2, 3)));

  return chosen
    .map(({ group, available }) => {
      const items = rng
        .sample(available, Math.max(1, available.length - rng.int(0, 1)))
        .map((entry) => copyFromCatalogue(rng, entry, suffix));

      return {
        id: `${group.id}-${kind}-${suffix}`,
        name: group.name,
        catalogueGroupId: group.id,
        items,
      };
    })
    .filter((group) => group.items.length > 0);
}

/**
 * Direct-cost sheets, one per course-semester (direction.md §11).
 *
 * Direct costs only. The indirect ones belong to the programme term and are
 * generated once, by `generateProgramCostSheets`.
 */
function generateCourseCostSheets(
  rng: Random,
  courses: Course[],
  enrollments: Enrollment[],
  terms: ProgramTerm[],
  catalogue: CatalogueGroup[],
): CourseCostSheet[] {
  const sheets: CourseCostSheet[] = [...mockCourseCostSheets];
  const existing = new Set(sheets.map((s) => `${s.courseId}:${s.semesterCode}`));

  const headCount = new Map<string, number>();
  for (const e of enrollments) {
    const key = `${e.courseId}:${e.semesterCode}`;
    headCount.set(key, (headCount.get(key) ?? 0) + 1);
  }

  // A course taught inside a curriculum must have a sheet: the programme cost
  // screen names the ones that do not, and a missing sheet there reads as an
  // unknown cost rather than as a cheap course.
  //
  // With one deliberate exception, below.
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
      const suffix = `${course.code.toLowerCase()}-${semesterCode}`;

      sheets.push({
        id: `cst-${course.code.toLowerCase()}-${semesterCode}`,
        courseId: course.id,
        semesterCode,
        status: rng.pick(SHEET_STATUSES),
        studentCount: headCount.get(key) ?? rng.int(15, 40),
        currency: "THB",
        // Built from the catalogue rather than cloned from a template sheet, so
        // every generated item knows where its rate came from (§12a).
        groups: sheetGroupsFrom(rng, catalogue, suffix, "direct"),
        createdAt: isoFromEpoch(createdDays),
        updatedAt: isoFromEpoch(createdDays + rng.int(5, 60)),
      });
    }
  }

  // One curriculum course is left uncosted on purpose (AUD-015, closed
  // 2026-09-16). "A course with no cost sheet contributes unknown, never zero"
  // is §13a's rule, it is unit tested, and until now it appeared on 0 of 19
  // terms - a rule stated in the spec and demonstrated nowhere. The programme
  // cost screen has a state for it, and a state that never renders is the
  // failure this project keeps repeating.
  //
  // Dropped after generation rather than skipped during it: skipping would
  // consume a different number of random draws and regenerate every sheet
  // after it, for a change that should touch exactly one row.
  return sheets.filter(
    (sheet) =>
      !(
        sheet.courseId === UNCOSTED_COURSE.courseId &&
        sheet.semesterCode === UNCOSTED_COURSE.semesterCode
      ),
  );
}

/**
 * The one curriculum course deliberately left without a direct cost sheet.
 *
 * CS296 in 202502 - a mid-sized course in a four-course curriculum, so the
 * programme it sits in still costs sensibly with one part unknown.
 */
const UNCOSTED_COURSE = { courseId: "crs-cs296", semesterCode: "202502" } as const;

/**
 * Indirect-cost sheets, one per programme term (direction.md §11).
 *
 * **One per term, with no exceptions.** A term without one has no classroom,
 * no utilities and no activities, which is not a state a real programme is ever
 * in — and an absent pool would quietly make every course in that term look
 * cheaper than its neighbours rather than showing an empty state.
 */
function generateProgramCostSheets(
  rng: Random,
  terms: ProgramTerm[],
  catalogue: CatalogueGroup[],
): ProgramCostSheet[] {
  const sheets: ProgramCostSheet[] = [...mockProgramCostSheets];
  const existing = new Set(sheets.map((s) => s.programTermId));

  for (const term of terms) {
    if (existing.has(term.id)) continue;
    existing.add(term.id);

    const createdDays = -rng.int(40, 300);

    sheets.push({
      id: `pcs-${term.id.replace(/^pgt-/, "")}`,
      programTermId: term.id,
      semesterCode: term.semesterCode,
      status: rng.pick(SHEET_STATUSES),
      // One driver exists, so this is not a draw. Writing it out rather than
      // defaulting it keeps the field visible in the generated data.
      driver: "credits",
      markupPercent: rng.pick([0, 0, 5, 8, 10]),
      // A constant, not a draw: varying it would consume from the random
      // stream and shift every value generated after it, for no gain.
      priceRoundingStep: DEFAULT_PRICE_ROUNDING_STEP,
      currency: "THB",
      groups: sheetGroupsFrom(rng, catalogue, term.id, "indirect"),
      createdAt: isoFromEpoch(createdDays),
      updatedAt: isoFromEpoch(createdDays + rng.int(5, 60)),
    });
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
        // The credit rate plus a per-term fee, so margins are not identical.
        // The rate is imported rather than written here: an invoice re-derives
        // the first half of this sum line by line (§13b), and a second copy of
        // the number would let a bill disagree with the price it bills.
        packagePrice: credits * CREDIT_RATE + rng.int(0, 8) * 500,
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
    const assessees = pickBlend(rng);

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
      assessees: cloneAssessees(assessees),
    });
  }

  return setups;
}

/**
 * Vary the configuration across setups so every readiness state appears.
 *
 * A student-only, ordering-free setup produces the "not used" mark on the
 * ranking column; a cohort with no TA makes the disabled-assessor case visible
 * without an administrator having to build it by hand. The default carries all
 * three assessee cards, including upward feedback on the teacher.
 */
function pickBlend(rng: Random): readonly AssesseeConfig[] {
  if (rng.chance(0.2)) return STUDENT_ONLY_ASSESSEES;
  if (rng.chance(0.15)) return NO_TA_ASSESSEES;
  return DEFAULT_ASSESSEES;
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

/* -------------------------------------------------------------------------- */
/* Invoices (direction.md §13b)                                               */
/* -------------------------------------------------------------------------- */

/** ISO date `days` from a fixed calendar date. Never reads the clock. */
function isoDateFrom(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Hands out line ids for one invoice, in the order the lines are built. */
function lineIds(invoiceId: string): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${invoiceId}-l${String(n).padStart(2, "0")}`;
  };
}

/** Everything the line builders need to look a course or an enrollment up. */
interface InvoiceContext {
  courseById: Map<string, Course>;
  statusByKey: Map<string, EnrollmentStatus>;
}

/**
 * The charges for one programme term: a line per curriculum course, then the
 * fee that reconciles them with the package price.
 */
function chargeLinesFor(
  term: ProgramTerm,
  context: InvoiceContext,
  nextId: () => string,
): InvoiceLine[] {
  const lines: InvoiceLine[] = [];
  let courseTotal = 0;

  for (const courseId of term.courseIds) {
    const course = context.courseById.get(courseId);
    if (!course) continue;

    const amount = courseLineAmount(course.credits);
    courseTotal += amount;
    lines.push({
      id: nextId(),
      kind: "course",
      description: `${course.code} ${course.name}`,
      courseId,
      courseCode: course.code,
      credits: course.credits,
      creditRate: CREDIT_RATE,
      amount,
    });
  }

  // Omitted when it is zero rather than printed as a zero line.
  const fee = programmeFeeAmount(term.packagePrice, courseTotal);
  if (fee !== 0) {
    lines.push({
      id: nextId(),
      kind: "fee",
      description: PROGRAMME_FEE_LABEL,
      amount: fee,
    });
  }

  return lines;
}

/**
 * What comes back for courses that did not run for this student.
 *
 * Built after the charges, in the order a reader expects them. A course with no
 * enrollment row at all earns nothing: choosing not to attend what was bought
 * is not a billing event (direction.md §13b).
 */
function creditLinesFor(
  studentId: string,
  term: ProgramTerm,
  context: InvoiceContext,
  nextId: () => string,
): InvoiceLine[] {
  const lines: InvoiceLine[] = [];

  for (const courseId of term.courseIds) {
    const course = context.courseById.get(courseId);
    if (!course) continue;

    const reason = creditReasonFor(
      context.statusByKey.get(`${studentId}:${courseId}:${term.semesterCode}`),
    );
    if (!reason) continue;

    lines.push({
      id: nextId(),
      kind: "credit",
      description: `Credit - ${course.code} ${reason}`,
      courseId,
      courseCode: course.code,
      creditReason: reason,
      creditPercent: CREDIT_PERCENT[reason],
      amount: creditLineAmount(courseLineAmount(course.credits), reason),
    });
  }

  return lines;
}

/**
 * Gather memberships by student and semester.
 *
 * The grain is the student-semester (direction.md §13b), so this runs before
 * any invoice is built: a student in two programmes gets one document with
 * lines from both, rather than two documents.
 */
function membershipsByStudentSemester(
  programEnrollments: ProgramEnrollment[],
  studentIds: Set<string>,
): Map<string, ProgramEnrollment[]> {
  const byKey = new Map<string, ProgramEnrollment[]>();

  for (const membership of programEnrollments) {
    if (!studentIds.has(membership.studentId)) continue;
    const key = `${membership.studentId}:${membership.semesterCode}`;
    const list = byKey.get(key);
    if (list) list.push(membership);
    else byKey.set(key, [membership]);
  }

  return byKey;
}

/**
 * One invoice per student per semester (direction.md §13b).
 *
 * Derived from programme enrollments, never generated beside them. Generated
 * independently, an invoice would bill a student for a term they never joined -
 * the same failure the programme layer produced when course enrollments were
 * generated apart from their parent.
 *
 * The lines are the **curriculum**, not the student's own enrollments: a
 * package is a package, so a course they skipped is still billed. What their
 * enrollment decides is the credit, and only a course that stopped early earns
 * one.
 */
function generateInvoices(
  rng: Random,
  programEnrollments: ProgramEnrollment[],
  terms: ProgramTerm[],
  enrollments: Enrollment[],
  courses: Course[],
  students: Student[],
  semesters: Semester[],
): Invoice[] {
  const termByKey = new Map(
    terms.map((term) => [`${term.programId}:${term.semesterCode}`, term]),
  );
  const semesterByCode = new Map(semesters.map((semester) => [semester.code, semester]));
  const context: InvoiceContext = {
    courseById: new Map(courses.map((course) => [course.id, course])),
    // Enrollment status by student:course:semester, for the credit rule.
    statusByKey: new Map(
      enrollments.map((enrollment) => [
        `${enrollment.studentId}:${enrollment.courseId}:${enrollment.semesterCode}`,
        enrollment.status,
      ]),
    ),
  };

  const byStudentSemester = membershipsByStudentSemester(
    programEnrollments,
    new Set(students.map((student) => student.id)),
  );

  const invoices: Invoice[] = [];
  let serial = 0;

  // Sorted, so the dataset does not depend on Map insertion order.
  for (const key of [...byStudentSemester.keys()].sort()) {
    const memberships = byStudentSemester.get(key) ?? [];
    const [studentId, semesterCode] = key.split(":");
    const semester = semesterByCode.get(semesterCode);
    if (!semester) continue;

    serial += 1;
    const id = `inv-${String(serial).padStart(4, "0")}`;
    const nextId = lineIds(id);

    const lines: InvoiceLine[] = [];
    const programTermIds: string[] = [];

    for (const membership of memberships) {
      const term = termByKey.get(`${membership.programId}:${membership.semesterCode}`);
      if (!term) continue;

      programTermIds.push(term.id);
      lines.push(
        ...chargeLinesFor(term, context, nextId),
        ...creditLinesFor(studentId, term, context, nextId),
      );
    }

    if (lines.length === 0) continue;

    const issuedOn = isoDateFrom(semester.startDate, -ISSUE_LEAD_DAYS);
    const dueOn = isoDateFrom(issuedOn, PAYMENT_TERM_DAYS);
    const status = invoiceStatusFor(rng, memberships, termByKey);

    invoices.push({
      id,
      number: `INV-${semesterCode.slice(0, 4)}-${String(serial).padStart(4, "0")}`,
      studentId,
      semesterCode,
      programTermIds,
      status,
      issuedOn,
      dueOn,
      // Paid a little before or after the due date, so an ageing view has a
      // spread rather than one date repeated.
      paidOn: status === "paid" ? isoDateFrom(dueOn, rng.int(-20, 5)) : undefined,
      currency: "THB",
      lines,
      createdAt: `${issuedOn}T00:00:00.000Z`,
      updatedAt: `${dueOn}T00:00:00.000Z`,
    });
  }

  return invoices;
}

/**
 * What state one invoice is in.
 *
 * Driven by the membership rather than the term, because what a student owes
 * follows their own standing. Two exceptions, both about honesty rather than
 * variety: a term that has not opened can only hold drafts, since its cohort is
 * not confirmed; and an invoice is cancelled only when *every* membership on it
 * was withdrawn, because a student who withdrew from one of two programmes
 * still owes for the other.
 */
function invoiceStatusFor(
  rng: Random,
  memberships: ProgramEnrollment[],
  termByKey: Map<string, ProgramTerm>,
): InvoiceStatus {
  const live = memberships.filter((m) => m.status !== "withdrawn");
  if (live.length === 0) return "cancelled";

  const planning = live.every(
    (m) =>
      termByKey.get(`${m.programId}:${m.semesterCode}`)?.status ===
      DRAFT_ONLY_TERM_STATUS,
  );
  if (planning) return "draft";

  // The furthest-along membership decides, so a completed programme is not
  // reported as pending because a second one has not started.
  const rank: Record<ProgramEnrollment["status"], number> = {
    withdrawn: 0,
    pending: 1,
    active: 2,
    completed: 3,
  };
  const leading = live.reduce((best, m) => (rank[m.status] > rank[best.status] ? m : best));
  return rng.pick(INVOICE_STATUS_BY_MEMBERSHIP[leading.status]);
}

export interface Dataset {
  semesters: Semester[];
  courses: Course[];
  students: Student[];
  enrollments: Enrollment[];
  courseCostSheets: CourseCostSheet[];
  programCostSheets: ProgramCostSheet[];
  programs: Program[];
  programTerms: ProgramTerm[];
  programEnrollments: ProgramEnrollment[];
  evaluationGroups: EvaluationGroup[];
  evaluationSetups: EvaluationSetup[];
  invoices: Invoice[];
  catalogueGroups: CatalogueGroup[];
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
  const catalogueGroups = [...mockCatalogueGroups];
  const courseCostSheets = generateCourseCostSheets(
    rng,
    courses,
    enrollments,
    programTerms,
    catalogueGroups,
  );
  const programCostSheets = generateProgramCostSheets(rng, programTerms, catalogueGroups);
  // Last: an invoice needs the curriculum for its lines and the course
  // enrollments for its credits, so both have to exist first.
  const invoices = generateInvoices(
    rng,
    programEnrollments,
    programTerms,
    enrollments,
    courses,
    students,
    semesters,
  );

  return {
    semesters,
    courses,
    students,
    enrollments,
    courseCostSheets,
    programCostSheets,
    programs,
    programTerms,
    programEnrollments,
    evaluationGroups,
    evaluationSetups,
    invoices,
    catalogueGroups,
  };
}
