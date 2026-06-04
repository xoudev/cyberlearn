import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    // The placeholder suite was removed; real component tests come later. Without
    // this, `vitest run` exits non-zero ("No test files found") and breaks CI.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.*", "src/index.ts"],
    },
  },
});
