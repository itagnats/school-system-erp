import { describe, expect, it } from "vitest";
import { programTermUpdateSchema } from "@/lib/api/contracts";

/**
 * The curriculum write contract (direction.md §4a, added 2026-09-21).
 *
 * `courseIds` *is* the teaching order, so the array is sent whole rather than
 * as add / remove / move operations — a reorder has no expression as a partial
 * edit. That decision is what these tests defend, because the two failure
 * modes it creates are both silent:
 *
 *   1. anything that reorders or deduplicates the array on its way through
 *      would rewrite the teaching order while looking like validation;
 *   2. `.optional()` must leave the key absent, or a patch that only reprices
 *      a term would arrive carrying a curriculum and overwrite it.
 *
 * What is **not** here: whether a course exists, runs that semester, or is
 * still active. Those need the store, so they live in `curriculumProblem` in
 * `server/services/program-service.ts` — which is `import "server-only"` and
 * unreachable from this harness. They are covered by the endpoint probes
 * recorded in the worklog, not by a unit test.
 */

const CURRICULUM = ["crs-it101", "crs-it205", "crs-it310"];

describe("programTermUpdateSchema: the curriculum", () => {
  it("accepts a list of courses and keeps the order it was given", () => {
    // The assertion that matters most in this file. A schema that sorted the
    // array would pass every other test here and silently reorder the
    // teaching plan of all 19 terms.
    const scrambled = ["crs-it310", "crs-it101", "crs-it205"];
    expect(programTermUpdateSchema.parse({ courseIds: scrambled }).courseIds).toEqual(
      scrambled,
    );
  });

  it("refuses an empty curriculum", () => {
    // A term with no courses still has a package price, so it would charge
    // for nothing. The editor disables the last Remove button; this is the
    // half that holds when the request does not come from the editor.
    expect(programTermUpdateSchema.safeParse({ courseIds: [] }).success).toBe(false);
  });

  it("refuses the same course twice", () => {
    const result = programTermUpdateSchema.safeParse({
      courseIds: ["crs-it101", "crs-it205", "crs-it101"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    // The message has to reach the field, or React Hook Form and the editor's
    // inline error have nothing to attach it to.
    expect(result.error.issues.some((issue) => issue.path[0] === "courseIds")).toBe(true);
  });

  it("refuses more courses than any term in this demo teaches", () => {
    const tooMany = Array.from({ length: 13 }, (_, index) => `crs-${index}`);
    expect(programTermUpdateSchema.safeParse({ courseIds: tooMany }).success).toBe(false);
    expect(
      programTermUpdateSchema.safeParse({ courseIds: tooMany.slice(0, 12) }).success,
    ).toBe(true);
  });

  it("refuses an empty course id", () => {
    expect(
      programTermUpdateSchema.safeParse({ courseIds: ["crs-it101", ""] }).success,
    ).toBe(false);
  });
});

describe("programTermUpdateSchema: the three edits do not leak into each other", () => {
  it("leaves the curriculum absent when only the price is sent", () => {
    // The `.partial()`-shaped trap, in the shape this schema can still have
    // it: a default or a fallback on `courseIds` would arrive as a real value
    // and `input.courseIds ?? current.term.courseIds` in the service would
    // then take the wrong side.
    const parsed = programTermUpdateSchema.parse({ packagePrice: 49200 });

    expect(parsed).toEqual({ packagePrice: 49200 });
    expect("courseIds" in parsed).toBe(false);
    expect("status" in parsed).toBe(false);
  });

  it("leaves the price absent when only the curriculum is sent", () => {
    const parsed = programTermUpdateSchema.parse({ courseIds: CURRICULUM });

    expect(parsed).toEqual({ courseIds: CURRICULUM });
    expect("packagePrice" in parsed).toBe(false);
  });

  it("accepts all three at once", () => {
    expect(
      programTermUpdateSchema.parse({
        packagePrice: 51000,
        status: "open",
        courseIds: CURRICULUM,
      }),
    ).toEqual({ packagePrice: 51000, status: "open", courseIds: CURRICULUM });
  });

  it("accepts an empty patch", () => {
    expect(programTermUpdateSchema.parse({})).toEqual({});
  });

  it("still validates the fields it is given", () => {
    expect(programTermUpdateSchema.safeParse({ packagePrice: -1 }).success).toBe(false);
    expect(programTermUpdateSchema.safeParse({ status: "cancelled" }).success).toBe(false);
    expect(programTermUpdateSchema.safeParse({ courseIds: "crs-it101" }).success).toBe(false);
  });
});
