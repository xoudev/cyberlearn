// @ts-check
import pluginNext from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import baseConfig from "./base.js";

/**
 * ESLint config for Next.js apps.
 * Extends base config with React, React Hooks, and Next.js specific rules.
 */
export default tseslint.config({ ignores: [".next/**"] }, ...baseConfig, {
  plugins: {
    react: reactPlugin,
    "react-hooks": reactHooksPlugin,
    "@next/next": pluginNext,
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    ...pluginNext.configs.recommended.rules,
    ...pluginNext.configs["core-web-vitals"].rules,

    // Not needed with React 17+ (new JSX transform)
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
  settings: {
    react: { version: "detect" },
  },
});
