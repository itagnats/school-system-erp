/**
 * Code 128, the symbology a counter-payment barcode is printed in.
 *
 * Hand-rolled rather than taken from a package. The whole encoder is a lookup
 * table and two loops, it has to run identically on the server render and the
 * client one, and a barcode library would arrive with a canvas renderer this
 * project has no use for — the output here is SVG, which is what prints without
 * blurring.
 *
 * ## What it implements
 *
 * Code Set B for text and Code Set C for runs of digits, switching between them
 * where that is shorter. **Code Set A is not implemented**, which is a
 * deliberate limit rather than an omission: Set A exists to carry ASCII control
 * characters, the real Thai bill-payment format separates its fields with
 * carriage returns, and this demo uses a printable `|` instead so the whole
 * payload stays inside Set B. The symbol is a valid Code 128 either way; only
 * the separator differs from the banking standard.
 *
 * Determinism matters here for the usual reason (`scaffold.md` §34): the same
 * string must produce the same bars in every process, so nothing in this file
 * reads a clock or a random source.
 */

/**
 * The 107 symbol patterns, from the Code 128 specification.
 *
 * Each is bar and space widths in modules, alternating and starting with a bar,
 * so `212222` is a 2-module bar, a 1-module space, and so on. Every pattern
 * totals 11 modules except the stop pattern, which carries a seventh element —
 * a final 2-module bar that terminates the symbol.
 *
 * `tests/barcode/code128.test.ts` asserts those two invariants plus uniqueness,
 * which is what catches a transcription slip in a table this shape.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112",
] as const;

/** Switch to Code Set C. Value 99 read from Set B. */
const CODE_C = 99;
/** Switch to Code Set B. Value 100 read from Set C. */
const CODE_B = 100;
const START_B = 104;
const STOP = 106;

/**
 * How long a digit run has to be before Set C is worth entering.
 *
 * Set C encodes two digits per symbol but costs one symbol to switch into and,
 * mid-string, one to leave. Six is the point where the pair-packing has paid
 * for both — below it the switch makes the symbol longer, not shorter.
 */
const MIN_SET_C_RUN = 6;

/** One bar, in module units from the left edge of the symbol. */
export interface Code128Bar {
  x: number;
  width: number;
}

export interface Code128Symbol {
  /** Total width in modules, quiet zones excluded. */
  modules: number;
  bars: Code128Bar[];
}

function digitRunAt(text: string, from: number): number {
  let length = 0;
  while (from + length < text.length) {
    const char = text[from + length];
    if (char < "0" || char > "9") break;
    length += 1;
  }
  return length;
}

function setBValue(char: string): number {
  const code = char.charCodeAt(0);
  if (code < 32 || code > 126) {
    throw new Error(`Code 128 set B cannot encode character code ${code}`);
  }
  return code - 32;
}

/**
 * The symbol values for `text`, start and check characters included.
 *
 * Exported because it is the half worth testing directly: the bars are a
 * mechanical expansion of these numbers, and a wrong check character is
 * invisible in the rendering and fatal to a scanner.
 */
export function code128Symbols(text: string): number[] {
  if (text.length === 0) {
    throw new Error("Code 128 needs at least one character");
  }

  const symbols: number[] = [START_B];
  let inSetC = false;
  let index = 0;

  while (index < text.length) {
    const run = digitRunAt(text, index);

    if (inSetC) {
      if (run >= 2) {
        symbols.push(Number(text.slice(index, index + 2)));
        index += 2;
      } else {
        // An odd digit left over, or a non-digit. Set C can only take pairs.
        symbols.push(CODE_B);
        inSetC = false;
      }
      continue;
    }

    // Only the even part of the run can be packed, so an odd run of seven is
    // worth as much as an even run of six.
    if (run - (run % 2) >= MIN_SET_C_RUN) {
      symbols.push(CODE_C);
      inSetC = true;
      continue;
    }

    symbols.push(setBValue(text[index]));
    index += 1;
  }

  // The check character weights each symbol by its position, counting the start
  // character as position zero. A switch symbol is data and carries weight like
  // anything else.
  let sum = symbols[0];
  for (let position = 1; position < symbols.length; position += 1) {
    sum += position * symbols[position];
  }
  symbols.push(sum % 103);
  symbols.push(STOP);

  return symbols;
}

/**
 * `text` as bars, ready to become SVG rects.
 *
 * Coordinates are in modules rather than pixels, so the caller scales the whole
 * symbol by setting a viewBox — which is what lets one barcode be legible on
 * screen and sharp on paper without re-encoding anything.
 */
export function encodeCode128(text: string): Code128Symbol {
  const bars: Code128Bar[] = [];
  let x = 0;

  for (const value of code128Symbols(text)) {
    const pattern = PATTERNS[value];
    for (let element = 0; element < pattern.length; element += 1) {
      const width = Number(pattern[element]);
      // Even elements are bars, odd ones spaces. Spaces move the cursor and
      // draw nothing.
      if (element % 2 === 0) bars.push({ x, width });
      x += width;
    }
  }

  return { modules: x, bars };
}

/** The pattern table, for the test that guards it. Not part of the API. */
export const CODE_128_PATTERNS: readonly string[] = PATTERNS;
