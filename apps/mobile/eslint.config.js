import baseConfig from "@cyberlearn/config/eslint/base";
import tseslint from "typescript-eslint";

// The shared config of the packages and the web apps: strict type-checked
// rules, no console.log, floating promises refused. (Its React and Next rules
// are for the Next apps; this one is React Native.)
//
// The app was written before it was linted, so a few rules of that config ask
// for more than a first pass can give without rewriting working screens. They
// are relaxed here, each for a reason, and the rest (no `any`, no unused
// code, no floating promise, no console.log, no unsafe member access) holds
// with no exception. Bring a relaxed rule back in its own change once the
// code meets it.
export default tseslint.config(
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `onPress={() => setOpen(true)}`: a handler that returns what its call
      // returns is how every screen of the app is written.
      "@typescript-eslint/no-confusing-void-expression": "off",

      // The tsconfig does not set noUncheckedIndexedAccess, so `list[i]` is typed
      // as present, and the `?.`, `?? fallback` and `=== true` that guard a
      // missing index read as needless. They are what keeps a short list from
      // crashing a screen.
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",

      // The Supabase client has no Database generic, so a row is `any` and the
      // `as` on it is the only type it gets: dropping a "needless" cast turns
      // the row back into `any`.
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "off",

      // The data hooks return what react-query infers, and a component's return
      // type is annotated where it is exported, not on every helper.
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // A count in a template (`${n} leçons`) is the point of a template.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],

      // An empty name is no name: `displayName || username` falls through on "".
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true } },
      ],

      // Each of these is a library migration to look at on a device: reanimated's
      // runOnJS, SVG's x/y props, expo-notifications' last-response calls.
      "@typescript-eslint/no-deprecated": "off",

      // French typography writes a no-break space before « : », « % » and « ? »
      // in strings, templates and JSX text, on purpose.
      "no-irregular-whitespace": [
        "error",
        { skipStrings: true, skipTemplates: true, skipJSXText: true, skipComments: true },
      ],

      // `_id` in `.filter((_id, i) => ...)`: a position taken for its neighbour.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // `expect.any(String)` and `process.env.TZ` are `any`, and a fake of an
    // async API is async without awaiting anything.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
);
