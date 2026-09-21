import { describe, expect, it } from "vitest";
import { programCreateSchema, programTermCreateSchema } from "@/lib/api/contracts";

/**
 * Creating a program and creating a term (direction.md §4a, added 2026-09-21).
 *
 * The rule these pin that no type can: **a program cannot be created without
 * its first term.** That is not tidiness, it is `AUD-036` in the shape of a
 * schema. Nothing written reaches the store, so a program created alone could
 * be listed from the client cache and never opened - its page is a server
 * component reading a store that took no write. Making the term optional
 * would quietly restore a flow whose second step 404s.
 *
 * What is **not** here: whether the semester exists, whether the program
 * already has a term in it, whether a course is real and active. Those need
 * the store, so they live in `server/services/program-service.ts`, which is
 * `import "server-only"` and unreachable from this harness. They are covered
 * by the endpoint probes in `AUDIT-LOG.md`.
 */

const FIRST_TERM = {
  semesterCode: "202602",
  courseIds: ["crs-it101", "crs-cs185"],
  packagePrice: 52000,
};

const VALID = {
  code: "BSC-AI",
  name: "BSc Artificial Intelligence",
  description: "A new program.",
  credential: "Bachelor of Science",
  status: "draft" as const,
  firstTerm: FIRST_TERM,
};

describe("programCreateSchema", () => {
  it("accepts a well-formed program with its first term", () => {
    expect(programCreateSchema.parse(VALID)).toEqual(VALID);
  });

  it("refuses a program with no first term", () => {
    // Deleted rather than destructured away: `sonarjs/no-unused-vars` treats
    // the discarded binding as dead code, underscore or not.
    const withoutTerm: Record<string, unknown> = { ...VALID };
    delete withoutTerm.firstTerm;
    expect(programCreateSchema.safeParse(withoutTerm).success).toBe(false);
  });

  it("reports a curriculum failure under the nested path", () => {
    // Pinned because the client has to match this exact string. The contract
    // nests the term, so a Zod failure is `firstTerm.courseIds`, while the
    // *service* validates the term alone and returns a bare `courseIds` - and
    // the dialog maps both. Probing the endpoint is what found the
    // difference; this is what keeps the mapping honest.
    const result = programCreateSchema.safeParse({
      ...VALID,
      firstTerm: { ...FIRST_TERM, courseIds: [] },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.join(".") === "firstTerm.courseIds"))
      .toBe(true);
  });

  it("keeps the teaching order it was given", () => {
    const scrambled = ["crs-cs185", "crs-it101"];
    expect(
      programCreateSchema.parse({ ...VALID, firstTerm: { ...FIRST_TERM, courseIds: scrambled } })
        .firstTerm.courseIds,
    ).toEqual(scrambled);
  });

  it("refuses a duplicate course in the first term", () => {
    expect(
      programCreateSchema.safeParse({
        ...VALID,
        firstTerm: { ...FIRST_TERM, courseIds: ["crs-it101", "crs-it101"] },
      }).success,
    ).toBe(false);
  });

  it("refuses a code that is not shaped like a program code", () => {
    for (const code of ["bsc-it", "B", "BSC IT", "BSC-IT-EXTRA", "BSC_IT"]) {
      expect(programCreateSchema.safeParse({ ...VALID, code }).success).toBe(false);
    }
    for (const code of ["BSC-IT", "BBA", "BFA-DE"]) {
      expect(programCreateSchema.safeParse({ ...VALID, code }).success).toBe(true);
    }
  });

  it("refuses a semester code that is not YYYYNN", () => {
    expect(
      programCreateSchema.safeParse({
        ...VALID,
        firstTerm: { ...FIRST_TERM, semesterCode: "2026-2" },
      }).success,
    ).toBe(false);
  });

  it("refuses a negative package price and allows a free one", () => {
    expect(
      programCreateSchema.safeParse({
        ...VALID,
        firstTerm: { ...FIRST_TERM, packagePrice: -1 },
      }).success,
    ).toBe(false);

    // Zero is a real answer, not a missing one: a scholarship program charges
    // nothing and still has a curriculum and a cost.
    expect(
      programCreateSchema.safeParse({
        ...VALID,
        firstTerm: { ...FIRST_TERM, packagePrice: 0 },
      }).success,
    ).toBe(true);
  });

  it("trims the name and the credential", () => {
    const parsed = programCreateSchema.parse({
      ...VALID,
      name: "  Spaced name  ",
      credential: "  Bachelor of Science  ",
    });
    expect(parsed.name).toBe("Spaced name");
    expect(parsed.credential).toBe("Bachelor of Science");
  });
});

describe("programTermCreateSchema", () => {
  it("is the first-term shape plus the program it joins", () => {
    const input = { ...FIRST_TERM, programId: "prg-it" };
    expect(programTermCreateSchema.parse(input)).toEqual(input);
  });

  it("requires the program id", () => {
    expect(programTermCreateSchema.safeParse(FIRST_TERM).success).toBe(false);
    expect(
      programTermCreateSchema.safeParse({ ...FIRST_TERM, programId: "" }).success,
    ).toBe(false);
  });

  it("reports a curriculum failure at the top level here", () => {
    // Not nested on this one, which is exactly why the client strips the
    // `firstTerm.` prefix rather than hardcoding either shape.
    const result = programTermCreateSchema.safeParse({
      ...FIRST_TERM,
      programId: "prg-it",
      courseIds: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.join(".") === "courseIds")).toBe(true);
  });
});
