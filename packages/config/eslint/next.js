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
    // The two rules react-hooks has always had. Its v7 "recommended" adds the
    // React Compiler's rules (purity, refs, set-state-in-effect...), which
    // prepare code for a compiler these apps do not run - and flag Date.now()
    // in a Server Component, where it is fine. Turn them on with the compiler.
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    ...pluginNext.configs.recommended.rules,
    ...pluginNext.configs["core-web-vitals"].rules,

    // Not needed with React 17+ (new JSX transform)
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
  settings: {
    // Named, not "detect": eslint-plugin-react finds the version through
    // context.getFilename(), which ESLint 10 removed, and crashes on it.
    react: { version: "19.3" },
  },
});
