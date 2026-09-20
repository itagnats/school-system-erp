import { describe, expect, it } from "vitest";
import { semesterCreateSchema, semesterUpdateSchema } from "@/lib/api/contracts";
import { previewSemesterCode } from "@/features/semesters/validations/semester-schema";

/**
 * The semester write contracts (direction.md §1, added 2026-09-20).
 *
 * Three things are pinned here, and each of them is a rule the type checker
 * cannot see:
 *
 *   1. the date ordering, which lives on the object because neither field can
 *      state it alone;
 *   2. the `.partial()` default trap the course contract already documents -
 *      an update must not invent values for fields the caller left out;
 *   3. that the form's code preview agrees with the code the server derives.
 */

const VALID = {
  name: "First Semester 2026",
  academicYear: 2026,
  term: 1,
  startDate: "2026-06-01",
  endDate: "2026-10-09",
  status: "upcoming" as const,
};

describe("semesterCreateSchema", () => {
  it("accepts a well-formed semester", () => {
    expect(semesterCreateSchema.parse(VALID)).toEqual(VALID);
  });

  it("carries no code, because the code is derived and never sent", () => {
    // The regression this guards: adding `code` to the request schema would
    // let a client name a semester something its year and term do not imply,
    // and the code is what every enrollment, cost sheet, program term and
    // invoice joins on.
    const parsed = semesterCreateSchema.parse({ ...VALID, code: "999999" });
    expect("code" in parsed).toBe(false);
  });

  it("rejects an end date on or before the start date", () => {
    expect(
      semesterCreateSchema.safeParse({ ...VALID, endDate: "2026-01-01" }).success,
    ).toBe(false);

    // Equal is not "after", so a zero-length semester is refused too.
    expect(
      semesterCreateSchema.safeParse({
        ...VALID,
        startDate: "2026-06-01",
        endDate: "2026-06-01",
      }).success,
    ).toBe(false);
  });

  it("puts the date-ordering error on endDate, where the form can show it", () => {
    const result = semesterCreateSchema.safeParse({ ...VALID, endDate: "2026-01-01" });
    expect(result.success).toBe(false);
    if (result.success) return;

    // A refinement with no `path` reports at the object root, which React Hook
    // Form has no field to attach to - the message would vanish.
    expect(result.error.issues.some((issue) => issue.path[0] === "endDate")).toBe(true);
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(semesterCreateSchema.safeParse({ ...VALID, startDate: "01/06/2026" }).success)
      .toBe(false);
  });

  it("rejects a term outside the two digits a code has room for", () => {
    expect(semesterCreateSchema.safeParse({ ...VALID, term: 0 }).success).toBe(false);
    expect(semesterCreateSchema.safeParse({ ...VALID, term: 100 }).success).toBe(false);
  });

  it("rejects an academic year outside the range this demo covers", () => {
    expect(semesterCreateSchema.safeParse({ ...VALID, academicYear: 1999 }).success)
      .toBe(false);
    expect(semesterCreateSchema.safeParse({ ...VALID, academicYear: 2101 }).success)
      .toBe(false);
  });

  it("trims the name", () => {
    expect(semesterCreateSchema.parse({ ...VALID, name: "  Term one  " }).name)
      .toBe("Term one");
  });
});

describe("semesterUpdateSchema", () => {
  it("does not invent values for fields the caller left out", () => {
    // The `.partial()` trap: a default left in place would come back filled in
    // and wipe the stored field when merged. Same defect the course contract
    // shipped once and was caught by curling the endpoint.
    //
    // This patches one field and checks every *other* one is absent, `status`
    // included. Patching `status` here instead would hide a default left on
    // it - and that is the field an empty patch would silently reset.
    const parsed = semesterUpdateSchema.parse({ name: "Renamed term" });

    expect(parsed).toEqual({ name: "Renamed term" });
    expect("status" in parsed).toBe(false);
    expect("academicYear" in parsed).toBe(false);
    expect("term" in parsed).toBe(false);
    expect("startDate" in parsed).toBe(false);
    expect("endDate" in parsed).toBe(false);
  });

  it("survives being merged over an existing record", () => {
    const stored = { ...VALID, status: "closed" as const };
    const merged = { ...stored, ...semesterUpdateSchema.parse({ name: "Renamed term" }) };

    // The regression: a default on `status` would put this back to "upcoming"
    // and reopen a closed semester through a rename.
    expect(merged.status).toBe("closed");
    expect(merged.name).toBe("Renamed term");
    expect(merged.startDate).toBe("2026-06-01");
  });

  it("checks the date ordering when both dates are present", () => {
    expect(
      semesterUpdateSchema.safeParse({
        startDate: "2026-06-01",
        endDate: "2026-01-01",
      }).success,
    ).toBe(false);
  });

  it("cannot check the ordering when only one date is sent", () => {
    // Deliberately allowed here, and the reason is worth pinning: a PATCH
    // carrying one date has nothing to compare it against, so `updateSemester`
    // re-checks it against the stored value. That is the only place both
    // numbers exist, and this test says so rather than leaving the gap to be
    // rediscovered as a bug.
    expect(semesterUpdateSchema.safeParse({ endDate: "1999-01-01" }).success).toBe(true);
    expect(semesterUpdateSchema.safeParse({ startDate: "2099-01-01" }).success).toBe(true);
  });

  it("still validates the fields it is given", () => {
    expect(semesterUpdateSchema.safeParse({ term: 0 }).success).toBe(false);
    expect(semesterUpdateSchema.safeParse({ name: "x" }).success).toBe(false);
    expect(semesterUpdateSchema.safeParse({ status: "finished" }).success).toBe(false);
  });

  it("accepts an empty patch", () => {
    expect(semesterUpdateSchema.parse({})).toEqual({});
  });
});

/**
 * The form's preview and the server's derivation are two implementations of
 * `YYYYNN`, and they have to agree.
 *
 * They are separate on purpose - `semesterCodeFor` lives in `server/`, which
 * is `import "server-only"` and cannot be loaded by a client component or by
 * this harness. So the duplication is forced, and this is the test that keeps
 * the copies honest.
 */
describe("previewSemesterCode", () => {
  it("pads the term to two digits", () => {
    expect(previewSemesterCode(2026, 1)).toBe("202601");
    expect(previewSemesterCode(2026, 2)).toBe("202602");
    expect(previewSemesterCode(2025, 12)).toBe("202512");
  });

  it("matches the codes the seed already uses", () => {
    expect(previewSemesterCode(2026, 1)).toBe("202601");
    expect(previewSemesterCode(2025, 2)).toBe("202502");
  });

  it("shows nothing rather than a wrong code while the form is incomplete", () => {
    // An empty number input yields NaN, and `${NaN}01` would render "NaN01" as
    // though it were a real code.
    expect(previewSemesterCode(Number.NaN, 1)).toBe("");
    expect(previewSemesterCode(2026, Number.NaN)).toBe("");
    expect(previewSemesterCode(2026.5, 1)).toBe("");
    expect(previewSemesterCode(2026, 0)).toBe("");
    expect(previewSemesterCode(2026, 100)).toBe("");
  });
});
