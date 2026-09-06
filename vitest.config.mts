import { defineConfig } from "vitest/config";

export default defineConfig({
  // Path aliases are read straight from tsconfig.json, so "@/lib/calculations"
  // resolves in tests exactly as it does in the application.
  resolve: { tsconfigPaths: true },
  test: {
    // The calculation layer is pure TypeScript, so no DOM is needed. A
    // component test, if one is ever added, should opt into jsdom per file.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Extension-qualified: a bare `**` also matches .gitkeep placeholders,
      // which then appear in lcov.info as uncovered files and drag the number
      // down for something that is not code.
      include: ["lib/calculations/**/*.ts", "features/**/calculations/**/*.ts"],
      // lcov is what SonarQube/SonarCloud ingests; text and html are for a
      // human reading the same run locally.
      reporter: ["text", "html", "lcov"],
    },
  },
});
