import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Automatic JSX runtime (like Next) so .tsx modules under test don't need React
  // in scope (e.g. lib/certificates/issue.tsx renders the certificate PDF JSX).
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [{ find: /^@\//, replacement: path.resolve(__dirname, "./") + "/" }],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    // jsdom's storage, where Node 25+ shadows it with its own empty one.
    setupFiles: ["./test/jsdom-storage.ts"],
  },
});
