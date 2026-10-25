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
  const accent = cssColor("--cosmetic-accent", "#FF6B2B", scope);
  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "AAA79F", fontStyle: "italic" },
      { token: "keyword", foreground: "FFAF85" },
      { token: "string", foreground: "A3D9AE" },
      { token: "number", foreground: "FFD08A" },
      { token: "type", foreground: "BFC6F6" },
      { token: "identifier", foreground: "F4F2ED" },
    ],
    colors: {
      // --color-bg-elevated
      "editor.background": "#0B0C0E",
      "editor.foreground": "#F4F2ED",
      "editor.lineHighlightBackground": "#191C22",
      // --color-text-disabled
      "editorLineNumber.foreground": "#AAA79F",
      "editorLineNumber.activeForeground": accent,
      // --color-border-default
      "editor.selectionBackground": BORDER,
      "editorCursor.foreground": accent,
      // --color-border-subtle
      "editor.inactiveSelectionBackground": "#303137",
      "editorIndentGuide.background1": "#303137",
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
