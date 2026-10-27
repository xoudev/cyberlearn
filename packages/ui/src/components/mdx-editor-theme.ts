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
 * `editor.foreground` once received a CSS expression and Monaco threw before
 * drawing. Scoped editor tokens are resolved to hex here, with the console's
 * existing palette as the fallback when no scoped theme is provided.
 */
export function mdxEditorTheme(scope?: Element | null): MonacoTheme {
  const background = cssColor("--mdx-editor-background", "#0B0C0E", scope);
  const panel = cssColor("--mdx-editor-panel", "#121418", scope);
  const border = cssColor("--mdx-editor-border", BORDER, scope);
  const muted = cssColor("--mdx-editor-muted", MUTED, scope);
  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "60A5FA" },
      { token: "string", foreground: "62D4A1" },
      {
        token: "comment",
        foreground: cssColor("--mdx-editor-muted", "#AAA79F", scope).slice(1),
        fontStyle: "italic",
      },
      { token: "number", foreground: "FFC36E" },
      { token: "tag", foreground: "FF929B" },
      { token: "attribute.name", foreground: "FFC36E" },
      { token: "attribute.value", foreground: "62D4A1" },
      { token: "markup.heading", foreground: "F4F2ED", fontStyle: "bold" },
      { token: "markup.bold", foreground: "F4F2ED", fontStyle: "bold" },
      { token: "markup.italic", foreground: "C2BFB8", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": background,
      // --color-text-secondary
      "editor.foreground": cssColor("--mdx-editor-foreground", "#C2BFB8", scope),
      // --color-bg-elevated
      "editor.lineHighlightBackground": panel,
      "editor.selectionBackground": cssColor("--mdx-editor-selection", "#30313788", scope),
      // --color-text-disabled
      "editorLineNumber.foreground": cssColor("--mdx-editor-muted", "#AAA79F", scope),
      "editorLineNumber.activeForeground": muted,
      "editorCursor.foreground": cssColor("--cosmetic-accent", "#FF6B2B", scope),
      // --color-border-subtle
      "editorIndentGuide.background1": cssColor("--mdx-editor-border", "#303137", scope),
      "scrollbarSlider.background": cssColor("--mdx-editor-selection", "#30313766", scope),
      "scrollbarSlider.hoverBackground": cssColor("--mdx-editor-border", "#74767D88", scope),
      "editorWidget.background": panel,
      "editorWidget.border": border,
      "editorSuggestWidget.background": panel,
      "input.background": background,
      "input.border": border,
    },
  };
}
