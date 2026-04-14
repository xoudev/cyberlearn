import nextConfig from "@cyberlearn/config/eslint/next";
import tseslint from "typescript-eslint";

export default tseslint.config(...nextConfig, {
  languageOptions: {
    parserOptions: {
      project: "./tsconfig.json",
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
