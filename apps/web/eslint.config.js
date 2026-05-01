import nextConfig from "@cyberlearn/config/eslint/next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // shadcn/ui primitives are vendored — skip linting them
  { ignores: ["components/ui/**"] },
  ...nextConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
