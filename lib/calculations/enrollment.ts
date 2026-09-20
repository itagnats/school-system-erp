import type {
  Enrollment,
  EnrollmentSource,
  ProgramEnrollment,
  ProgramTerm,
  SemesterCode,
} from "@/types";

/**
 * Enrollment expansion (direction.md §7a).
 *
 * A student joins a **program term**, and that one act produces two kinds of
 * record: the program membership that the package price is billed against,
 * and one course enrollment per curriculum course. Everything downstream —
 * grouping, evaluation, cost attribution, the invoice — hangs off the second,
 * but none of it is entered by hand.
 *
 * This lives here rather than in `server/services/` on purpose. Every file
 * under `server/` imports `server-only`, which Vitest refuses to load, so logic
 * that stays there cannot be tested at all: `AUD-014` records the invoice
 * service's term-attribution branch as the most intricate code in the project
 * and the least exercised. The expansion below is the equivalent piece of this
 * feature, so it starts on the testable side of that line.
 *
 * Nothing here reads a clock. The caller supplies `stamp`, because a service
 * that reads `Date.now()` makes two renders of the same page disagree.
 */

/** What the caller must know about the term. The rest of it is not our business. */
export type EnrollmentTerm = Pick<ProgramTerm, "id" | "programId" | "semesterCode" | "courseIds">;

export interface EnrollmentRequest {
  term: EnrollmentTerm;
  studentId: string;
  source: EnrollmentSource;
  /** Fixed timestamp supplied by the caller, never read from a clock here. */
  stamp: string;
}

export interface EnrollmentDraft {
  programEnrollment: ProgramEnrollment;
  enrollments: Enrollment[];
}

/**
 * Ids are derived from the natural key, not from a counter.
 *
 * A running serial would be the obvious choice and is wrong here for the same
 * reason `AUD-013` was raised against `copyCatalogItem`: writes are not
 * persisted, so the table never grows, so every create in a session would read
 * the same "next" serial and two enrollments made one after the other would
 * collide — in the query cache, and in React keys. Student, course and semester
 * already identify the row uniquely, so they are the discriminator.
 *
 * `copyCatalogItem` closed it differently, and the difference is instructive:
 * a sheet's copies live inside one parent that can be counted, so an ordinal
 * within the sheet works there. An enrollment has no such parent.
 */
export function programEnrollmentIdFor(studentId: string, semesterCode: SemesterCode): string {
  return `pen-${studentId}-${semesterCode}`;
}

export function courseEnrollmentIdFor(
  studentId: string,
  courseId: string,
  semesterCode: SemesterCode,
): string {
  return `enr-${studentId}-${courseId}-${semesterCode}`;
}

/**
 * One program term in, one membership and N course enrollments out.
 *
 * The new membership is `active` and the course rows are `enrolled`: the
 * student has joined the program and has not yet started the individual
 * courses. Those are the two statuses a completed "Review → Enrol" step should
 * produce — `pending` would describe an enrollment that had been requested and
 * not yet acted on, which is not what just happened.
 */
export function expandCurriculum({
  term,
  studentId,
  source,
  stamp,
}: EnrollmentRequest): EnrollmentDraft {
  const programEnrollment: ProgramEnrollment = {
    id: programEnrollmentIdFor(studentId, term.semesterCode),
    studentId,
    programId: term.programId,
    semesterCode: term.semesterCode,
    status: "active",
    enrolledAt: stamp,
    updatedAt: stamp,
  };

  const enrollments: Enrollment[] = term.courseIds.map((courseId) => ({
    id: courseEnrollmentIdFor(studentId, courseId, term.semesterCode),
    studentId,
    courseId,
    semesterCode: term.semesterCode,
    status: "enrolled",
    // No evaluation group: a group is a partition of a cohort, assigned when
    // the cohort is grouped, not a property a single enrollment carries in.
    source,
    enrolledAt: stamp,
    updatedAt: stamp,
  }));

  return { programEnrollment, enrollments };
}

/**
 * The two rules that make "one student, one program, one term per semester"
 * true rather than merely observed (agreed 2026-09-15).
 *
 * It already holds across all 635 seeded program enrollments — maximum one per
 * student per semester, and not one student who changes program — but nothing
 * enforced it, and the invoice depends on it: one invoice per student per
 * semester over one package price cannot represent a second package. `AUD-014`
 * is the same fact seen from the other end, a multi-term split that has never
 * run.
 */
export type EnrollmentConflict =
  | { kind: "already-enrolled"; semesterCode: SemesterCode; programId: string }
  | { kind: "other-program"; programId: string };

export type ExistingMembership = Pick<
  ProgramEnrollment,
  "studentId" | "programId" | "semesterCode" | "status"
>;

/**
 * A withdrawn membership is not a conflict — it is the record of a student who
 * left, and re-enrolling them is a legitimate act rather than a duplicate.
 */
export function findEnrollmentConflict(
  memberships: readonly ExistingMembership[],
  studentId: string,
  term: Pick<EnrollmentTerm, "programId" | "semesterCode">,
): EnrollmentConflict | undefined {
  const held = memberships.filter(
    (membership) => membership.studentId === studentId && membership.status !== "withdrawn",
  );

  const sameSemester = held.find((membership) => membership.semesterCode === term.semesterCode);
  if (sameSemester) {
    return {
      kind: "already-enrolled",
      semesterCode: sameSemester.semesterCode,
      programId: sameSemester.programId,
    };
  }

  const elsewhere = held.find((membership) => membership.programId !== term.programId);
  if (elsewhere) {
    return { kind: "other-program", programId: elsewhere.programId };
  }

  return undefined;
}

/**
 * The human-facing id for a student created during enrollment.
 *
 * Seeded students run `ST-2026-001` upward, so a created one must not take a
 * number from that range. The `N` prefix keeps it out of the way and is honest
 * besides: this row came from a write, and a write in PRIME lasts until the
 * next reload.
 *
 * The suffix is a hash of the email rather than the next free serial, for the
 * `AUD-013` reason. Nothing is persisted, so the table never grows, so "next
 * free" returns the same number for every create in a session and two students
 * would end up sharing an id the type calls unique. An email is unique by the
 * time this is called - the service rejects a duplicate - so hashing it gives a
 * stable id per student instead of per attempt. Two emails can still collide
 * into one suffix; the service checks and steps past it.
 */
export function demoStudentSerial(email: string, attempt = 0): string {
  let hash = 2166136261;
  const seed = `${email.trim().toLowerCase()}#${attempt}`;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ST-2026-N${String((hash >>> 0) % 1000).padStart(3, "0")}`;
}
