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
  const background = cssColor("--mdx-editor-background", "#07051E", scope);
  const panel = cssColor("--mdx-editor-panel", "#0A0826", scope);
  const border = cssColor("--mdx-editor-border", BORDER, scope);
  const muted = cssColor("--mdx-editor-muted", MUTED, scope);
  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "6E8BFF" },
      { token: "string", foreground: "0AFFD4" },
      {
        token: "comment",
        foreground: cssColor("--mdx-editor-muted", "#44406B", scope).slice(1),
        fontStyle: "italic",
      },
      { token: "number", foreground: "FFB020" },
      { token: "tag", foreground: "FF6B9D" },
      { token: "attribute.name", foreground: "FFB020" },
      { token: "attribute.value", foreground: "0AFFD4" },
      { token: "markup.heading", foreground: "F5F5FA", fontStyle: "bold" },
      { token: "markup.bold", foreground: "F5F5FA", fontStyle: "bold" },
      { token: "markup.italic", foreground: "D0CDEC", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": background,
      // --color-text-secondary
      "editor.foreground": cssColor("--mdx-editor-foreground", "#B8B5D1", scope),
      // --color-bg-elevated
      "editor.lineHighlightBackground": panel,
      "editor.selectionBackground": cssColor("--mdx-editor-selection", "#2A256088", scope),
      // --color-text-disabled
      "editorLineNumber.foreground": cssColor("--mdx-editor-muted", "#3F3D5C", scope),
      "editorLineNumber.activeForeground": muted,
      "editorCursor.foreground": cssColor("--cosmetic-accent", "#0AFFD4", scope),
      // --color-border-subtle
      "editorIndentGuide.background1": cssColor("--mdx-editor-border", "#1F1B47", scope),
      "scrollbarSlider.background": cssColor("--mdx-editor-selection", "#2A256066", scope),
      "scrollbarSlider.hoverBackground": cssColor("--mdx-editor-border", "#44406B88", scope),
      "editorWidget.background": panel,
      "editorWidget.border": border,
      "editorSuggestWidget.background": panel,
      "input.background": background,
      "input.border": border,
    },
  };
}
