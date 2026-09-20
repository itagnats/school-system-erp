import { describe, expect, it } from "vitest";
import { courseCreateSchema, courseUpdateSchema } from "@/lib/api/contracts";

/**
 * The create and update schemas differ in one way that is easy to get wrong and
 * invisible to the type checker, so it is pinned here.
 *
 * `courseCreateSchema.partial()` looks like the obvious way to build the update
 * schema. It is not: `.partial()` makes a key optional but keeps its default,
 * so validating `{ status }` yields `{ status, description: "", offeredIn: [] }`
 * and merging that over the stored record wipes both fields. That shipped once
 * and was caught by curling the endpoint.
 */
describe("courseCreateSchema", () => {
  it("fills the optional fields with their defaults", () => {
    const parsed = courseCreateSchema.parse({
      code: "IT101",
      name: "Introduction to IT",
      credits: 3,
      status: "draft",
    });

    expect(parsed.description).toBe("");
    expect(parsed.offeredIn).toEqual([]);
  });

  it("rejects a code that is not two to four letters then three digits", () => {
    const result = courseCreateSchema.safeParse({
      code: "nope",
      name: "Introduction to IT",
      credits: 3,
      status: "draft",
    });

    expect(result.success).toBe(false);
  });

  it("rejects credits outside the allowed range", () => {
    const tooMany = courseCreateSchema.safeParse({
      code: "IT101",
      name: "Introduction to IT",
      credits: 99,
      status: "draft",
    });

    expect(tooMany.success).toBe(false);
  });

  it("normalizes a code by trimming it", () => {
    const parsed = courseCreateSchema.parse({
      code: "  IT101  ",
      name: "Introduction to IT",
      credits: 3,
      status: "draft",
    });

    expect(parsed.code).toBe("IT101");
  });
});

describe("courseUpdateSchema", () => {
  it("does not invent values for fields the caller left out", () => {
    const parsed = courseUpdateSchema.parse({ status: "archived" });

    // The regression: these must be absent, not defaulted. A merge of this
    // object over an existing course has to leave the other fields alone.
    expect(parsed).toEqual({ status: "archived" });
    expect("description" in parsed).toBe(false);
    expect("offeredIn" in parsed).toBe(false);
  });

  it("survives being merged over an existing record", () => {
    const existing = {
      code: "IT101",
      name: "Introduction to IT",
      description: "A real description",
      credits: 3,
      status: "active" as const,
      offeredIn: ["202601", "202602"],
    };

    const merged = { ...existing, ...courseUpdateSchema.parse({ status: "archived" }) };

    expect(merged.status).toBe("archived");
    expect(merged.description).toBe("A real description");
    expect(merged.offeredIn).toEqual(["202601", "202602"]);
  });

  it("still validates the fields it is given", () => {
    expect(courseUpdateSchema.safeParse({ credits: 0 }).success).toBe(false);
    expect(courseUpdateSchema.safeParse({ code: "x" }).success).toBe(false);
  });

  it("accepts an empty patch", () => {
    expect(courseUpdateSchema.parse({})).toEqual({});
  });
});
