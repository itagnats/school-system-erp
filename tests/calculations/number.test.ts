import { describe, expect, it } from "vitest";
import { clamp, mean, percentOf, round, roundMoney } from "@/lib/calculations";

describe("round", () => {
  it("rounds half away from zero", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(-1.005, 2)).toBe(-1.01);
  });

  it("returns 0 for non-finite input rather than NaN", () => {
    expect(round(Number.NaN)).toBe(0);
    expect(round(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("roundMoney", () => {
  it("carries two decimals", () => {
    expect(roundMoney(1234.5678)).toBe(1234.57);
  });
});

describe("percentOf", () => {
  it("computes a share of a total", () => {
    expect(percentOf(25, 200)).toBe(12.5);
  });

  it("returns 0 instead of dividing by zero", () => {
    expect(percentOf(10, 0)).toBe(0);
  });
});

describe("clamp", () => {
  it("bounds a value into the range", () => {
    expect(clamp(5, 0, 100)).toBe(5);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
  });
});

describe("mean", () => {
  it("averages a list", () => {
    expect(mean([88, 92, 95, 90])).toBe(91.25);
  });

  it("returns null for an empty list rather than NaN", () => {
    expect(mean([])).toBeNull();
  });
});
