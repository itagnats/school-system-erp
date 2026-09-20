import { describe, expect, it } from "vitest";
import {
  courseEnrollmentIdFor,
  demoStudentSerial,
  expandCurriculum,
  findEnrolmentConflict,
  programEnrollmentIdFor,
} from "@/lib/calculations/enrollment";
import type { EnrolmentTerm, ExistingMembership } from "@/lib/calculations/enrollment";

const STAMP = "2026-01-05T09:00:00.000Z";

function term(overrides: Partial<EnrolmentTerm> = {}): EnrolmentTerm {
  return {
    id: "pgt-it-202601",
    programId: "prg-it",
    semesterCode: "202601",
    courseIds: ["crs-it101", "crs-it201", "crs-it301"],
    ...overrides,
  };
}

function membership(overrides: Partial<ExistingMembership> = {}): ExistingMembership {
  return {
    studentId: "stu-001",
    programId: "prg-it",
    semesterCode: "202601",
    status: "active",
    ...overrides,
  };
}

describe("expandCurriculum", () => {
  it("creates one course enrollment per curriculum course", () => {
    const draft = expandCurriculum({
      term: term(),
      studentId: "stu-001",
      source: "existing-profile",
      stamp: STAMP,
    });

    expect(draft.enrollments).toHaveLength(3);
    expect(draft.enrollments.map((row) => row.courseId)).toEqual([
      "crs-it101",
      "crs-it201",
      "crs-it301",
    ]);
  });

  it("puts the membership on the programme and the rows on the courses", () => {
    const draft = expandCurriculum({
      term: term(),
      studentId: "stu-001",
      source: "new-student",
      stamp: STAMP,
    });

    expect(draft.programEnrollment.programId).toBe("prg-it");
    expect(draft.programEnrollment.status).toBe("active");
    expect(draft.enrollments.every((row) => row.status === "enrolled")).toBe(true);
    expect(draft.enrollments.every((row) => row.semesterCode === "202601")).toBe(true);
  });

  it("records which of the three paths the student came in through", () => {
    for (const source of ["existing-profile", "previous-course", "new-student"] as const) {
      const draft = expandCurriculum({ term: term(), studentId: "stu-001", source, stamp: STAMP });
      expect(draft.enrollments.every((row) => row.source === source)).toBe(true);
    }
  });

  it("stamps every record with the supplied timestamp and never a clock", () => {
    const draft = expandCurriculum({
      term: term(),
      studentId: "stu-001",
      source: "existing-profile",
      stamp: STAMP,
    });

    expect(draft.programEnrollment.enrolledAt).toBe(STAMP);
    for (const row of draft.enrollments) {
      expect(row.enrolledAt).toBe(STAMP);
      expect(row.updatedAt).toBe(STAMP);
    }
  });

  it("leaves the evaluation group unset, because grouping partitions a cohort", () => {
    const draft = expandCurriculum({
      term: term(),
      studentId: "stu-001",
      source: "existing-profile",
      stamp: STAMP,
    });

    expect(draft.enrollments.every((row) => row.evaluationGroupId === undefined)).toBe(true);
  });

  it("survives a term with an empty curriculum without inventing a row", () => {
    const draft = expandCurriculum({
      term: term({ courseIds: [] }),
      studentId: "stu-001",
      source: "existing-profile",
      stamp: STAMP,
    });

    expect(draft.enrollments).toEqual([]);
    expect(draft.programEnrollment.studentId).toBe("stu-001");
  });

  /**
   * The `AUD-013` case, in advance. Two enrolments made one after another must
   * not share an id just because the timestamp behind them is fixed.
   */
  it("gives two students in the same term distinct ids", () => {
    const one = expandCurriculum({
      term: term(),
      studentId: "stu-001",
      source: "existing-profile",
      stamp: STAMP,
    });
    const two = expandCurriculum({
      term: term(),
      studentId: "stu-002",
      source: "existing-profile",
      stamp: STAMP,
    });

    const ids = [...one.enrollments, ...two.enrollments].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(one.programEnrollment.id).not.toBe(two.programEnrollment.id);
  });

  it("gives one student in two semesters distinct ids", () => {
    const first = programEnrollmentIdFor("stu-001", "202601");
    const second = programEnrollmentIdFor("stu-001", "202602");
    expect(first).not.toBe(second);

    expect(courseEnrollmentIdFor("stu-001", "crs-it101", "202601")).not.toBe(
      courseEnrollmentIdFor("stu-001", "crs-it101", "202602"),
    );
  });
});

describe("findEnrolmentConflict", () => {
  it("passes a student with no history", () => {
    expect(findEnrolmentConflict([], "stu-001", term())).toBeUndefined();
  });

  it("rejects a second programme in the same semester", () => {
    const conflict = findEnrolmentConflict(
      [membership({ programId: "prg-ds" })],
      "stu-001",
      term(),
    );

    expect(conflict).toEqual({
      kind: "already-enrolled",
      semesterCode: "202601",
      programId: "prg-ds",
    });
  });

  it("rejects re-enrolling into the same term twice", () => {
    const conflict = findEnrolmentConflict([membership()], "stu-001", term());
    expect(conflict?.kind).toBe("already-enrolled");
  });

  it("rejects a student moving to another programme in a later semester", () => {
    const conflict = findEnrolmentConflict(
      [membership({ semesterCode: "202501", programId: "prg-ds", status: "completed" })],
      "stu-001",
      term(),
    );

    expect(conflict).toEqual({ kind: "other-programme", programId: "prg-ds" });
  });

  it("allows the same programme in a later semester, which is the normal case", () => {
    const conflict = findEnrolmentConflict(
      [membership({ semesterCode: "202502", status: "completed" })],
      "stu-001",
      term(),
    );

    expect(conflict).toBeUndefined();
  });

  it("ignores another student entirely", () => {
    const conflict = findEnrolmentConflict(
      [membership({ studentId: "stu-999", programId: "prg-ds" })],
      "stu-001",
      term(),
    );

    expect(conflict).toBeUndefined();
  });

  /**
   * A withdrawn membership is the record of someone who left. Re-enrolling them
   * is a real act, not a duplicate, so it must not be blocked by their own
   * history.
   */
  it("lets a withdrawn student enrol again", () => {
    const conflict = findEnrolmentConflict(
      [membership({ status: "withdrawn" }), membership({ programId: "prg-ds", status: "withdrawn" })],
      "stu-001",
      term(),
    );

    expect(conflict).toBeUndefined();
  });
});

/**
 * `AUD-022`. The serial had no test at all, while the two functions beside it
 * had sixteen between them - and it is the one carrying a hand-rolled hash into
 * a 1,000-wide space, which is a narrower space than it looks.
 */
describe("demoStudentSerial", () => {
  it("keeps out of the seeded range", () => {
    // Seeded students are ST-2026-001 upward. The N says "this came from a
    // write", and a created student that could take ST-2026-042 would collide
    // with a real row rather than with another create.
    expect(demoStudentSerial("ada@example.com")).toMatch(/^ST-2026-N\d{3}$/);
  });

  it("is stable for one email", () => {
    // The whole reason it hashes rather than counting: the table never grows,
    // so "next free" would return the same number for every create in a
    // session. Stability per email is what replaces that.
    expect(demoStudentSerial("ada@example.com")).toBe(demoStudentSerial("ada@example.com"));
  });

  it("ignores case and surrounding space", () => {
    // The service rejects a duplicate email before this is called, and it does
    // so case-insensitively. If the hash disagreed, the same person could hold
    // two ids.
    expect(demoStudentSerial("  Ada@Example.COM ")).toBe(demoStudentSerial("ada@example.com"));
  });

  it("gives different emails different serials", () => {
    const serials = new Set(
      ["ada", "grace", "alan", "edsger", "barbara"].map((name) =>
        demoStudentSerial(`${name}@example.com`),
      ),
    );
    expect(serials.size).toBe(5);
  });

  it("moves on the next attempt, which is what makes the collision loop work", () => {
    // `createStudent` steps past a taken suffix by incrementing `attempt`. That
    // loop only terminates if a new attempt actually produces a new serial -
    // untested until now, and unreachable in the running app, because nothing
    // is persisted so the table never holds a created row.
    const email = "ada@example.com";
    const attempts = new Set([0, 1, 2, 3, 4].map((n) => demoStudentSerial(email, n)));
    expect(attempts.size).toBe(5);
  });
});
