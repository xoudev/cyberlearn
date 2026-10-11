import type { BeforeMount } from "@monaco-editor/react";
import { BORDER, cssColor, type MonacoTheme } from "@cyberlearn/ui";

/** The name the lesson's code editors register their Monaco theme under. */
export const LESSON_EDITOR_THEME = "cyberlearn-dark";

/**
 * The Monaco theme of the code editors in a lesson: CodePlayground and
 * PythonChallenge, which had one copy each.
 *
 * Monaco reads these colours in JavaScript, where a CSS variable is not a
 * colour (MonacoTheme in @cyberlearn/ui). `editor.background` once read
 * var(--color-bg-elevated): Monaco threw, and with it the whole lesson page,
 * as soon as a section with an editor came up. So the values are written out,
 * from the dark tokens. Only the accent is read at runtime, the one the
 * reader has equipped, under `scope`: the editor's frame, inside the wrapper
 * that carries the cosmetic. It used to be var(--cosmetic-accent) too, which
 * Monaco painted red.
 */
export function lessonEditorTheme(scope?: Element | null): MonacoTheme {
  const accent = cssColor("--cosmetic-accent", "#0AFFD4", scope);
  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7F7BA9", fontStyle: "italic" },
      { token: "keyword", foreground: "4D8BFF" },
      { token: "string", foreground: "0AFFD4" },
      { token: "number", foreground: "FFB020" },
      { token: "type", foreground: "B14DFF" },
      { token: "identifier", foreground: "E0DDFF" },
    ],
    colors: {
      // --color-bg-elevated
      "editor.background": "#0A0826",
      "editor.foreground": "#E0DDFF",
      "editor.lineHighlightBackground": "#1A1838",
      // --color-text-disabled
      "editorLineNumber.foreground": "#3F3D5C",
      "editorLineNumber.activeForeground": accent,
      // --color-border-default
      "editor.selectionBackground": BORDER,
      "editorCursor.foreground": accent,
      // --color-border-subtle
      "editor.inactiveSelectionBackground": "#1F1B47",
      "editorIndentGuide.background1": "#1F1B47",
      "editorWhitespace.foreground": BORDER,
    },
  };
}

/** Registers the theme with the Monaco a lesson editor is about to mount. */
export function defineLessonEditorTheme(
  monaco: Parameters<BeforeMount>[0],
  scope: Element | null,
): void {
  // SAFETY: BeforeMount provides the full Monaco namespace; defineTheme is a standard API
  (
    monaco as { editor: { defineTheme: (name: string, data: MonacoTheme) => void } }
  ).editor.defineTheme(LESSON_EDITOR_THEME, lessonEditorTheme(scope));
}
