import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

/**
 * Lint configuration.
 *
 * `eslint-plugin-sonarjs` is Sonar's own plugin and runs a large subset of the
 * JS/TS rules the server applies, so a smell is caught by `npm run verify`
 * rather than by CI after a push. It does not replace the scan: duplication
 * detection (CPD), coverage and security hotspots exist only server-side.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  {
    rules: {
      // The design system page is a catalogue: the same demo shell repeats per
      // component by design, and collapsing it into a loop would hide the
      // markup the page exists to show. Duplication there is the point.
      "sonarjs/no-identical-functions": ["error", 5],
    },
  },
  {
    rules: {
      // S4323. `type SemesterCode = string` is an alias that carries meaning:
      // it says which string a field expects at every call site. Sonar reads it
      // as redundant because it erases to the same type, but the documentation
      // is the point, and the alternative is a branded type that every literal
      // would have to be cast into.
      "sonarjs/redundant-type-aliases": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Tests assert on literal values; naming every expected string as a
      // constant makes the assertion harder to read, not easier.
      "sonarjs/no-duplicate-string": "off",
      // S1244 warns against comparing floats for equality, which is right in
      // application code and wrong here: these tests exist to pin the exact
      // output of `round` and `roundMoney`. `toBeCloseTo` would assert the
      // opposite of what is being tested.
      "sonarjs/no-floating-point-equality": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output, not source.
    "coverage/**",
    ".vitest/**",
    // Project memory, skills and reference material dropped in for comparison.
    // Gitignored, and not application source; ESLint does not read .gitignore,
    // so a single .tsx left in there would otherwise fail `npm run verify`.
    ".claude/**",
  ]),
]);

export default eslintConfig;
