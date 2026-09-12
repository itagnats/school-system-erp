import { describe, expect, it } from "vitest";
import {
  CODE_128_PATTERNS,
  code128Symbols,
  encodeCode128,
} from "@/lib/barcode";

/**
 * The encoder is a transcribed lookup table and two loops, so the tests split
 * the same way: invariants that catch a typo in the table, and worked examples
 * that catch a mistake in the switching or the check character.
 *
 * What these cannot check is that a physical scanner reads the result — nothing
 * in this repository can. The claim being made is that the symbol follows the
 * specification, not that it has been scanned.
 */
describe("the pattern table", () => {
  it("holds 107 symbols", () => {
    expect(CODE_128_PATTERNS).toHaveLength(107);
  });

  it("gives every symbol 11 modules, except the stop pattern's 13", () => {
    CODE_128_PATTERNS.forEach((pattern, value) => {
      const modules = [...pattern].reduce((sum, digit) => sum + Number(digit), 0);
      expect({ value, modules }).toEqual({ value, modules: value === 106 ? 13 : 11 });
    });
  });

  it("gives every symbol six elements, except the stop pattern's seven", () => {
    CODE_128_PATTERNS.forEach((pattern, value) => {
      expect(pattern).toHaveLength(value === 106 ? 7 : 6);
    });
  });

  it("has no duplicate pattern — two values sharing one would be unreadable", () => {
    expect(new Set(CODE_128_PATTERNS).size).toBe(CODE_128_PATTERNS.length);
  });
});

describe("code128Symbols", () => {
  it("wraps text in a start, a check character and a stop", () => {
    // Set B: "A" is 65 - 32 = 33. Check = (104 + 1 x 33) mod 103 = 34.
    expect(code128Symbols("A")).toEqual([104, 33, 34, 106]);
  });

  it("weights the check character by position", () => {
    // "AB" -> 33, 34. Check = (104 + 33 + 2 x 34) mod 103 = 205 mod 103 = 102.
    expect(code128Symbols("AB")).toEqual([104, 33, 34, 102, 106]);
  });

  it("packs a long digit run two to a symbol", () => {
    // Eight digits: switch to set C (99), then four pairs.
    const symbols = code128Symbols("12345678");
    expect(symbols.slice(0, 6)).toEqual([104, 99, 12, 34, 56, 78]);
  });

  it("leaves a short digit run in set B, where switching would cost more", () => {
    // Four digits is below the threshold: no 99 anywhere.
    expect(code128Symbols("1234")).not.toContain(99);
  });

  it("returns to set B for the odd digit a run cannot pair", () => {
    // Seven digits: six pair off, the seventh forces a switch back (100).
    const symbols = code128Symbols("1234567");
    expect(symbols.slice(0, 6)).toEqual([104, 99, 12, 34, 56, 100]);
    // "7" in set B is 55 - 32 = 23.
    expect(symbols[6]).toBe(23);
  });

  it("encodes a payment payload end to end", () => {
    const symbols = code128Symbols("|123456789012345|ST2026001");
    // "|" is 124 - 32 = 92, then the fifteen digits go to set C.
    expect(symbols.slice(0, 4)).toEqual([104, 92, 99, 12]);
    expect(symbols.at(-1)).toBe(106);
    expect(symbols.at(-2)).toBeLessThan(103);
  });

  it("refuses a character set B cannot carry", () => {
    expect(() => code128Symbols("a\rb")).toThrow(/cannot encode/);
  });

  it("refuses an empty string", () => {
    expect(() => code128Symbols("")).toThrow(/at least one/);
  });
});

describe("encodeCode128", () => {
  it("lays the bars out left to right without overlapping", () => {
    const { bars, modules } = encodeCode128("INV-2026-0142");

    let previousEnd = 0;
    for (const bar of bars) {
      expect(bar.x).toBeGreaterThanOrEqual(previousEnd);
      expect(bar.width).toBeGreaterThan(0);
      previousEnd = bar.x + bar.width;
    }
    expect(previousEnd).toBeLessThanOrEqual(modules);
  });

  it("ends on a bar, which is what terminates the symbol", () => {
    const { bars, modules } = encodeCode128("INV-2026-0142");
    const last = bars[bars.length - 1];
    expect(last.x + last.width).toBe(modules);
  });

  it("is the width the symbol count implies", () => {
    // Every symbol is 11 modules and the stop is 13.
    const symbols = code128Symbols("PRIME");
    const { modules } = encodeCode128("PRIME");
    expect(modules).toBe((symbols.length - 1) * 11 + 13);
  });

  it("is deterministic — the same string is always the same bars", () => {
    expect(encodeCode128("ST-2026-001")).toEqual(encodeCode128("ST-2026-001"));
  });
});
