import { describe, expect, it } from "vitest";
import { mockPrograms } from "@/data/mock/programs";
import { seed } from "@/data/seed";

/**
 * The joins the seed has to hold, asserted rather than described (`AUD-021`).
 *
 * A student's program was a **name** until 2026-09-20, and "one student
 * belongs to one program" was enforced by comparing that name to
 * `Program.name`. The seed had a second copy of the same join, a hand-written
 * `PROGRAM_BY_ACADEMIC_NAME` map, and neither copy could fail loudly: rename a
 * program in one place and its cohort silently empties.
 *
 * `academic.programId` replaced both. This is what makes that an improvement
 * rather than a second field to keep in step — the id must resolve, and the
 * name beside it must be the name that id carries.
 *
 * The counts are here for the reason the `data-layer` skill gives: **record the
 * shape after a repair.** They are not interesting in themselves. They are the
 * evidence that adding the field left the dataset alone, and they will catch
 * the failure that nearly shipped with it — moving one `rng.pick` above the
 * block before it reorders the whole PRNG stream, which took memberships from
 * 635 to 628 and enrollments from 1,297 to 1,261 without breaking anything.
 */
describe("the seed's program join", () => {
  const programNameById = new Map(mockPrograms.map((program) => [program.id, program.name]));

  it("reads a real field", () => {
    // The probe trap this project has hit before: reading a field that is not
    // there gives every row `undefined`, and a set of one `undefined` looks
    // exactly like a set of one real value. Assert the type before counting.
    for (const student of seed.students) {
      expect(typeof student.academic.programId).toBe("string");
    }
  });

  it("points every student at a program that exists", () => {
    const dangling = seed.students
      .filter((student) => !programNameById.has(student.academic.programId))
      .map((student) => `${student.studentId} -> ${student.academic.programId}`);
    expect(dangling).toEqual([]);
  });

  it("keeps the display name in step with the id", () => {
    const disagreeing = seed.students
      .filter(
        (student) =>
          programNameById.get(student.academic.programId) !== student.academic.program,
      )
      .map((student) => student.studentId);
    expect(disagreeing).toEqual([]);
  });

  it("puts every student in a program, and every program to work", () => {
    const held = new Set(seed.students.map((student) => student.academic.programId));
    // A program with no students is a curriculum, a cost sheet and a set of
    // invoices that no screen can ever show populated.
    expect([...held].sort()).toEqual(mockPrograms.map((program) => program.id).sort());
  });

  it("holds the recorded shape", () => {
    expect(seed.students).toHaveLength(300);
    expect(seed.programEnrollments).toHaveLength(635);
    expect(seed.enrollments).toHaveLength(1297);
    expect(seed.invoices).toHaveLength(635);
  });

  it("enrols each member onto their own program", () => {
    // The rule the name-keyed map existed to implement, now checkable. The
    // first version of the program layer generated memberships independently
    // of the profile and almost nobody took their own program's courses; the
    // margin came out at 98% everywhere and nothing complained.
    const programOf = new Map(
      seed.students.map((student) => [student.id, student.academic.programId]),
    );

    const wrong = seed.programEnrollments
      .filter((membership) => programOf.get(membership.studentId) !== membership.programId)
      .map((membership) => `${membership.studentId} -> ${membership.programId}`);
    expect(wrong).toEqual([]);
  });
});
