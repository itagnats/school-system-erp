import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The drift guard for the prose documentation.
 *
 * `/system-guide` exists because it **demonstrates rather than restates** —
 * every number on it is read from a service as the page renders, so it cannot
 * be wrong. The markdown under `docs/` has no such property, and on 2026-09-17
 * four of the six files carried claims that were simply false: a README calling
 * the project a scaffold with eleven modules built, an evaluation model listing
 * four shipped features as "not built", counts of services and route handlers
 * that had not been true for weeks.
 *
 * Prose cannot be derived. A number inside prose can be, so every count quoted
 * in a document carries an invisible marker naming the thing it counts:
 *
 * ```markdown
 * thirty-three route handlers <!-- count:routeHandlers -->
 * ```
 *
 * The comment renders as nothing at all, so the sentence reads normally, and
 * this test reads the numeral in front of it and compares it to the filesystem.
 * A document that falls behind the code fails the build instead of quietly
 * misleading the next reader.
 *
 * Three rules keep the guard honest:
 *
 * - an **unknown** marker name fails, so a typo cannot silently pass;
 * - a registered counter that appears in **no** document fails, so the registry
 *   cannot accumulate counts nothing is checking;
 * - the numeral may be written in digits or in words, because a sentence that
 *   opens with a numeral reads badly and a document should not be deformed by
 *   the thing that checks it.
 *
 * The numeral and its marker must sit on the **same line**, so a hard-wrapped
 * paragraph cannot separate a count from the thing verifying it and leave the
 * marker reading whatever word the wrap happened to put in front of it.
 */

/** Vitest resolves its root from `vitest.config.mts`, which is the repository root. */
const ROOT = process.cwd();

/**
 * What each marker name means, as a question the filesystem can answer.
 *
 * Every entry is a directory shape rather than a hand-kept list, so adding a
 * service or a route handler moves the expected number on its own.
 */
const COUNTERS: Record<string, () => number> = {
  /** Every `route.ts` under `app/api`, at any depth. */
  routeHandlers: () => filesNamed(join(ROOT, "app", "api"), "route.ts").length,

  /** Top-level folders under `app/api` — one per API domain. */
  apiDomains: () => directoriesIn(join(ROOT, "app", "api")).length,

  /** `server/services/*.ts`, excluding the barrel. */
  services: () => modulesIn(join(ROOT, "server", "services")).length,

  /** `features/*` — the domain modules. */
  features: () => directoriesIn(join(ROOT, "features")).length,

  /** `data/mock/*.ts`, excluding the barrel. */
  mockFiles: () => modulesIn(join(ROOT, "data", "mock")).length,

  /** `types/*.ts`, excluding the barrel. One file per domain. */
  types: () => modulesIn(join(ROOT, "types")).length,

  /** `components/ui/*.tsx` — the generic primitives. */
  uiPrimitives: () => filesWithExtension(join(ROOT, "components", "ui"), ".tsx").length,

  /** `components/shared/*.tsx` — the application patterns. */
  sharedComponents: () =>
    filesWithExtension(join(ROOT, "components", "shared"), ".tsx").length,

  /** `lib/calculations/*.ts`, excluding the barrel. */
  calculations: () => modulesIn(join(ROOT, "lib", "calculations")).length,

  /** Chart components in `components/data-viz` — the frame, tooltip and tokens
   *  are the surrounding apparatus and are not charts. */
  charts: () =>
    filesWithExtension(join(ROOT, "components", "data-viz"), ".tsx").filter((name) =>
      name.endsWith("-chart.tsx"),
    ).length,

  /** Every Vitest file under `tests/`, this one included. */
  testFiles: () => filesEndingWith(join(ROOT, "tests"), ".test.ts").length,

  /**
   * Rows in the measured contrast table on `/design-system#a11y-contrast`.
   *
   * Counted from the source of the table rather than from a note beside it,
   * because "all 33 text pairs clear 4.5:1" is precisely the claim that drifted:
   * the shipped table has never had 33 rows.
   */
  contrastPairs: () =>
    readFileSync(
      join(ROOT, "app", "design-system", "_sections", "accessibility.tsx"),
      "utf8",
    ).match(/\{ pair: "/g)?.length ?? 0,
};

/**
 * `<!-- count:routeHandlers -->`, with the numeral immediately before it.
 *
 * The pattern matches the marker alone and the numeral is taken by walking back
 * over the text in front of it. A single expression spanning both would need a
 * greedy group against a literal, which is how a regular expression acquires
 * super-linear backtracking on a file somebody is free to write anything into.
 */
const MARKER = /<!-- count:(\w+) -->/g;

const WORDS: Record<string, number> = {
  two: 2,
  four: 4,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  twenty: 20,
  "twenty-seven": 27,
  "thirty-three": 33,
};

interface Marker {
  file: string;
  name: string;
  written: string;
}

function collectMarkers(): Marker[] {
  const files = [join(ROOT, "README.md"), ...filesEndingWith(join(ROOT, "docs"), ".md")];

  return files.flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return [...text.matchAll(MARKER)].map((match) => ({
      file: relative(ROOT, file).replaceAll("\\", "/"),
      name: match[1],
      written: wordBefore(text.slice(0, match.index)),
    }));
  });
}

/**
 * The last whitespace-separated token on the line the marker sits on.
 *
 * Bounded to that line deliberately: a hard-wrapped paragraph must not let a
 * marker read whatever word the wrap happened to put in front of it, and an
 * empty answer fails the "writes a number the marker can read" case rather than
 * passing quietly.
 */
function wordBefore(before: string): string {
  const line = before.slice(before.lastIndexOf("\n") + 1);
  const tokens = line.trimEnd().split(/\s+/);
  return tokens[tokens.length - 1] ?? "";
}

function parseWritten(written: string): number | undefined {
  const digits = written.replaceAll(",", "");
  if (/^\d+$/.test(digits)) return Number(digits);
  return WORDS[written.toLowerCase()];
}

describe("documentation counts", () => {
  const markers = collectMarkers();

  it("finds markers to check", () => {
    // A guard that silently checks nothing is worse than no guard: it reports
    // green while every document rots.
    expect(markers.length).toBeGreaterThan(0);
  });

  it("names a counter that exists", () => {
    const unknown = markers
      .filter((marker) => !(marker.name in COUNTERS))
      .map((marker) => `${marker.file}: count:${marker.name}`);
    expect(unknown).toEqual([]);
  });

  it("writes a number the marker can read", () => {
    const unreadable = markers
      .filter((marker) => parseWritten(marker.written) === undefined)
      .map((marker) => `${marker.file}: "${marker.written}" before count:${marker.name}`);
    expect(unreadable).toEqual([]);
  });

  it("quotes the number the repository actually has", () => {
    const wrong = markers.flatMap((marker) => {
      const counter = COUNTERS[marker.name];
      if (!counter) return [];
      const actual = counter();
      const written = parseWritten(marker.written);
      if (written === actual) return [];
      return [`${marker.file}: count:${marker.name} says ${marker.written}, actual ${actual}`];
    });
    expect(wrong).toEqual([]);
  });

  it("uses every counter it registers", () => {
    const used = new Set(markers.map((marker) => marker.name));
    const unused = Object.keys(COUNTERS).filter((name) => !used.has(name));
    expect(unused).toEqual([]);
  });
});

/* Filesystem helpers. Each answers one shape of question and nothing else. */

function entriesIn(dir: string) {
  return readdirSync(dir).sort();
}

function directoriesIn(dir: string): string[] {
  return entriesIn(dir).filter((name) => statSync(join(dir, name)).isDirectory());
}

function filesWithExtension(dir: string, extension: string): string[] {
  return entriesIn(dir).filter(
    (name) => name.endsWith(extension) && statSync(join(dir, name)).isFile(),
  );
}

/** Modules in a folder, excluding the `index.ts` barrel that re-exports them. */
function modulesIn(dir: string): string[] {
  return filesWithExtension(dir, ".ts").filter((name) => name !== "index.ts");
}

function walk(dir: string): string[] {
  return entriesIn(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function filesNamed(dir: string, fileName: string): string[] {
  // By basename rather than by suffix, so the separator stays the platform's
  // problem rather than this file's.
  return walk(dir).filter((path) => basename(path) === fileName);
}

function filesEndingWith(dir: string, suffix: string): string[] {
  return walk(dir).filter((path) => path.endsWith(suffix));
}
