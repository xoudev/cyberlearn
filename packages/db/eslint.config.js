import baseConfig from "@cyberlearn/config/eslint/base";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Seed/reset/backfill scripts are not library code - intentional console.log output
  {
    ignores: [
      "prisma/seed.ts",
      "prisma/reset-user.ts",
      "prisma/reset-content.ts",
      "prisma/seed-paths.ts",
      "prisma/backfill-badge-xp.ts",
    ],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Repository and supabase factory functions return complex inferred types
    // (Prisma queries, Supabase clients) - explicit return types add no safety.
    files: ["src/repositories/**/*.ts", "src/supabase/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    // Integration tests use raw Supabase clients with any-typed responses.
    files: ["src/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/dot-notation": "off",
    },
  },
);
