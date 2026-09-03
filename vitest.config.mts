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
      include: ["lib/calculations/**", "features/**/calculations/**"],
      reporter: ["text", "html"],
    },
  },
});
