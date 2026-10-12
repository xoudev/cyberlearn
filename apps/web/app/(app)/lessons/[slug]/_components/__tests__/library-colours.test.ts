// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ITheme } from "@xterm/xterm";
import type { MonacoTheme } from "@cyberlearn/ui";
import { LESSON_EDITOR_THEME, lessonEditorTheme } from "../lesson-editor-theme";
import { linuxTerminalTheme, simulatedTerminalTheme } from "../terminal-themes";

/**
 * Every colour a lesson hands to Monaco or xterm is one that library can read.
 *
 * Both are given colours as strings and parse them in JavaScript, where
 * var(--color-*) means nothing. When the hex literals were swept into tokens
 * (#425), Monaco threw on the editor's background and took the lesson page
 * down with it, and xterm painted its own defaults. Mermaid had the same
 * fall: diagram.test.tsx holds its colours.
 *
 * Each builder is checked three ways: on the server (fallbacks only), in
 * jsdom (which resolves no var(), so fallbacks again), and with what a
 * browser computes, where the reader's accent comes through.
 */

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const MONACO_RULE = /^[0-9a-f]{6}$/i;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A browser's answer for every probe: this colour, and every token defined. */
function inABrowser(rgb: string): void {
  vi.spyOn(globalThis, "getComputedStyle").mockImplementation(() => {
    // SAFETY: cssColor reads `color` and getPropertyValue, all this stands in for.
    return {
      color: rgb,
      getPropertyValue: () => "defined",
    } as unknown as CSSStyleDeclaration;
  });
}

const SETTINGS: Record<string, () => void> = {
  "on the server": () => {
    vi.stubGlobal("document", undefined);
  },
  "in jsdom": () => undefined,
  "in a browser": () => {
    inABrowser("rgb(255, 77, 210)");
  },
  "in a browser computing a colour hex cannot hold": () => {
    inABrowser("color(display-p3 1 0.3 0.8)");
  },
};

function monacoProblems(theme: MonacoTheme): string[] {
  return [
    ...Object.entries(theme.colors)
      .filter(([, value]) => !HEX.test(value))
      .map(([key, value]) => `${key}: ${value}`),
    ...theme.rules
      .filter((rule) => rule.foreground !== undefined && !MONACO_RULE.test(rule.foreground))
      .map((rule) => `${rule.token}: ${String(rule.foreground)}`),
  ];
}

function xtermProblems(theme: ITheme): string[] {
  return Object.entries(theme)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .filter(([, value]) => !HEX.test(value))
    .map(([key, value]) => `${key}: ${value}`);
}

describe.each(Object.entries(SETTINGS))("the colours handed to libraries, %s", (_, setUp) => {
  it("Monaco, in the lesson editors: hex only", () => {
    setUp();
    expect(monacoProblems(lessonEditorTheme(null))).toEqual([]);
  });

  it("xterm, in the simulated terminal (both shells) and the Linux machine: hex only", () => {
    setUp();
    const themes = [
      simulatedTerminalTheme("bash", null),
      simulatedTerminalTheme("powershell", null),
      linuxTerminalTheme(null),
    ];
    for (const theme of themes) {
      expect(Object.keys(theme).length).toBeGreaterThan(15);
      expect(xtermProblems(theme)).toEqual([]);
    }
  });
});

describe("the reader's accent", () => {
  it("reaches the lesson editors' cursor and the terminal's prompt, as hex", () => {
    inABrowser("rgb(255, 77, 210)");
    const editor = lessonEditorTheme(null);
    expect(editor.colors["editorCursor.foreground"]).toBe("#ff4dd2");
    expect(editor.colors["editorLineNumber.activeForeground"]).toBe("#ff4dd2");
    const terminal = simulatedTerminalTheme("bash", null);
    expect(terminal.cursor).toBe("#ff4dd2");
    expect(terminal.green).toBe("#ff4dd2");
  });

  it("falls back to the brand turquoise where nothing resolves it", () => {
    expect(lessonEditorTheme(null).colors["editorCursor.foreground"]).toBe("#0AFFD4");
    expect(simulatedTerminalTheme("bash", null).cursor).toBe("#0AFFD4");
  });

  it("leaves PowerShell its yellow cursor", () => {
    inABrowser("rgb(255, 77, 210)");
    expect(simulatedTerminalTheme("powershell", null).cursor).toBe("#FFFF54");
  });
});

describe("the lesson editors", () => {
  it("share one theme, under the name both mount with", () => {
    expect(LESSON_EDITOR_THEME).toBe("cyberlearn-dark");
  });

  it("would have refused the theme as #425 left it", () => {
    const broken = lessonEditorTheme(null);
    broken.colors["editor.background"] = "var(--color-bg-elevated)";
    expect(monacoProblems(broken)).toEqual(["editor.background: var(--color-bg-elevated)"]);
  });
});
