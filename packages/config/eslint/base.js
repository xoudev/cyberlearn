// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Base ESLint config for all packages.
 * Uses typescript-eslint strict mode — no `any`, explicit return types on public APIs.
 * Biome handles formatting; ESLint focuses exclusively on code quality.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      // Enforce explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "error",

      // No console.log in production code — use the Pino logger instead
      "no-console": ["error", { allow: ["warn", "error"] }],

      // Disallow type assertions that bypass safety (use `as` sparingly)
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
      ],

      // Require explicit handling of Promise rejections
      "@typescript-eslint/no-floating-promises": "error",

      // Disallow non-null assertions — handle null explicitly
      "@typescript-eslint/no-non-null-assertion": "error",

      // Prefer nullish coalescing over || for nullable values
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // Consistent import ordering (imports first, then types)
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Enforce exhaustive switches on union types
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    // Relaxed rules for test files
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
);
