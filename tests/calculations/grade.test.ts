import { describe, expect, it } from "vitest";
import { calculateGrade, gradeRange } from "@/lib/calculations";

describe("calculateGrade", () => {
  it("maps each band to its grade", () => {
    expect(calculateGrade(100)).toBe("A");
    expect(calculateGrade(90)).toBe("A");
    expect(calculateGrade(89.99)).toBe("B");
    expect(calculateGrade(80)).toBe("B");
    expect(calculateGrade(79)).toBe("C");
    expect(calculateGrade(70)).toBe("C");
    expect(calculateGrade(69)).toBe("D");
    expect(calculateGrade(60)).toBe("D");
    expect(calculateGrade(59.99)).toBe("F");
    expect(calculateGrade(0)).toBe("F");
  });

  it("treats the band boundary as inclusive on the lower bound", () => {
    // 90 is an A, not a B. Off-by-one here would misgrade a real student.
    expect(calculateGrade(90)).toBe("A");
    expect(calculateGrade(89.999)).toBe("B");
  });

  it("clamps scores that fall outside 0-100", () => {
    expect(calculateGrade(140)).toBe("A");
    expect(calculateGrade(-20)).toBe("F");
  });
});

describe("gradeRange", () => {
  it("reports the inclusive display range for each grade", () => {
    expect(gradeRange("A")).toEqual({ min: 90, max: 100 });
    expect(gradeRange("B")).toEqual({ min: 80, max: 89 });
    expect(gradeRange("F")).toEqual({ min: 0, max: 59 });
  });
});
