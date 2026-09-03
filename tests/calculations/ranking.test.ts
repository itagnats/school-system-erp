import { describe, expect, it } from "vitest";
import { calculateRanking } from "@/lib/calculations";

const entry = (id: string, score: number) => ({ id, score });

describe("calculateRanking", () => {
  it("orders by score descending", () => {
    const result = calculateRanking([
      entry("c", 87.2),
      entry("a", 92.5),
      entry("b", 89.7),
    ]);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b", "c"]);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("shares a rank on a tie and skips the consumed ranks", () => {
    const result = calculateRanking([
      entry("a", 90),
      entry("b", 90),
      entry("c", 80),
    ]);
    expect(result.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(result.map((r) => r.tied)).toEqual([true, true, false]);
  });

  it("ties scores that round to the same displayed value", () => {
    // Both display as 88.33, so they must not be ranked apart on a difference
    // the student cannot see.
    const result = calculateRanking([entry("a", 88.3341), entry("b", 88.3349)]);
    expect(result.map((r) => r.rank)).toEqual([1, 1]);
    expect(result.every((r) => r.tied)).toBe(true);
  });

  it("separates scores that round to different displayed values", () => {
    // 88.334 -> 88.33 and 88.335 -> 88.34 are genuinely different figures, so
    // the ranking must reflect that rather than collapsing them.
    const result = calculateRanking([entry("a", 88.334), entry("b", 88.335)]);
    expect(result.map((r) => r.item.id)).toEqual(["b", "a"]);
    expect(result.map((r) => r.rank)).toEqual([1, 2]);
    expect(result.some((r) => r.tied)).toBe(false);
  });

  it("does not mutate the input array", () => {
    const input = [entry("a", 70), entry("b", 95)];
    calculateRanking(input);
    expect(input.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("returns an empty list for no entries", () => {
    expect(calculateRanking([])).toEqual([]);
  });
});
