import { cssColor } from "../lib/css-color.js";
import type { MonacoTheme } from "../lib/monaco-theme.js";
import { BORDER, MUTED } from "../lib/palette.js";

/** The name the lesson editor registers its Monaco theme under. */
export const MDX_EDITOR_THEME = "cyberlearn";

/**
 * The lesson editor's Monaco theme, for the console and a teacher's class.
 *
 * Monaco takes its colours through JavaScript, where a CSS variable is not a
 * colour (lib/monaco-theme.ts): they are written out, from the dark tokens.
 * `editor.foreground` once read var(--color-text-secondary), and Monaco threw
 * before the editor ever drew. Only the cursor is read at
 * runtime: it is the accent the writer has equipped, read under `scope`, the
 * panel; in the console, where nothing is equipped, the brand turquoise.
 */
export function mdxEditorTheme(scope?: Element | null): MonacoTheme {
  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "6E8BFF" },
      { token: "string", foreground: "0AFFD4" },
      { token: "comment", foreground: "44406B", fontStyle: "italic" },
      { token: "number", foreground: "FFB020" },
      { token: "tag", foreground: "FF6B9D" },
      { token: "attribute.name", foreground: "FFB020" },
      { token: "attribute.value", foreground: "0AFFD4" },
      { token: "markup.heading", foreground: "F5F5FA", fontStyle: "bold" },
      { token: "markup.bold", foreground: "F5F5FA", fontStyle: "bold" },
      { token: "markup.italic", foreground: "D0CDEC", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#07051E",
      // --color-text-secondary
      "editor.foreground": "#B8B5D1",
      // --color-bg-elevated
      "editor.lineHighlightBackground": "#0A0826",
      "editor.selectionBackground": "#2A256088",
      // --color-text-disabled
      "editorLineNumber.foreground": "#3F3D5C",
      "editorLineNumber.activeForeground": MUTED,
      "editorCursor.foreground": cssColor("--cosmetic-accent", "#0AFFD4", scope),
      // --color-border-subtle
      "editorIndentGuide.background1": "#1F1B47",
      "scrollbarSlider.background": "#2A256066",
      "scrollbarSlider.hoverBackground": "#44406B88",
      "editorWidget.background": "#0A0826",
      "editorWidget.border": BORDER,
      "editorSuggestWidget.background": "#0A0826",
      "input.background": "#07051E",
      "input.border": BORDER,
    },
  };
}
