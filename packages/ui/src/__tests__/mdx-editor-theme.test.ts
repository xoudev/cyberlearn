import { afterEach, describe, expect, it, vi } from "vitest";
import { MDX_EDITOR_THEME, mdxEditorTheme } from "../components/mdx-editor-theme.js";
import type { MonacoTheme } from "../lib/monaco-theme.js";

/**
 * The lesson editor's Monaco theme holds only colours Monaco can read.
 *
 * Monaco parses them in JavaScript. A `colors` value that is not hex paints
 * red, and `editor.foreground` or `editor.background` that is not hex throws
 * ("Illegal value for token color") before the editor draws: that is what
 * var(--color-text-secondary) did to the console's editor and the teacher's.
 */

const COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const RULE_FOREGROUND = /^[0-9a-f]{6}$/i;

function unreadable(theme: MonacoTheme): string[] {
  return [
    ...Object.entries(theme.colors)
      .filter(([, value]) => !COLOR.test(value))
      .map(([key, value]) => `${key}: ${value}`),
    ...theme.rules
      .filter((rule) => rule.foreground !== undefined && !RULE_FOREGROUND.test(rule.foreground))
      .map((rule) => `${rule.token}: ${String(rule.foreground)}`),
  ];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the MDX editor's Monaco theme", () => {
  it("is registered under the name the panel asks Monaco for", () => {
    expect(MDX_EDITOR_THEME).toBe("cyberlearn");
  });

  it("holds only hex colours, in the page", () => {
    expect(unreadable(mdxEditorTheme(document.body))).toEqual([]);
  });

  it("holds only hex colours, on the server", () => {
    vi.stubGlobal("document", undefined);
    expect(unreadable(mdxEditorTheme())).toEqual([]);
  });

  it("puts the cursor in the accent the browser resolved, as hex", () => {
    vi.spyOn(globalThis, "getComputedStyle").mockImplementation(() => {
      // SAFETY: cssColor reads `color` and getPropertyValue, all this stands in for.
      return {
        color: "rgb(177, 77, 255)",
        getPropertyValue: (name: string) => (name === "--cosmetic-accent" ? "#b14dff" : ""),
      } as unknown as CSSStyleDeclaration;
    });
    const theme = mdxEditorTheme(document.body);
    expect(theme.colors["editorCursor.foreground"]).toBe("#b14dff");
    expect(unreadable(theme)).toEqual([]);
  });

  it("would have refused the theme as #425 left it", () => {
    const broken = mdxEditorTheme();
    broken.colors["editor.foreground"] = "var(--color-text-secondary)";
    expect(unreadable(broken)).toEqual(["editor.foreground: var(--color-text-secondary)"]);
  });

  it("resolves the scoped class palette without passing CSS expressions to Monaco", () => {
    const tokens: Record<string, string> = {
      "--mdx-editor-background": "#0b0c0e",
      "--mdx-editor-foreground": "#c2bfb8",
      "--mdx-editor-panel": "#191c22",
      "--mdx-editor-border": "#44454a",
      "--mdx-editor-muted": "#aaa79f",
      "--mdx-editor-selection": "#44454a88",
    };
    vi.spyOn(globalThis, "getComputedStyle").mockImplementation((element) => {
      const name = element.getAttribute("style")?.match(/var\((--[a-z-]+)\)/)?.[1] ?? "";
      // cssColor only reads these two members from the browser's resolved style.
      return {
        color: tokens[name] ?? "#ff6b2b",
        getPropertyValue: (key: string) => tokens[key] ?? "",
      } as unknown as CSSStyleDeclaration;
    });
    const theme = mdxEditorTheme(document.body);
    expect(theme.colors["editor.background"]).toBe("#0b0c0e");
    expect(theme.colors["editor.foreground"]).toBe("#c2bfb8");
    expect(theme.colors["editorWidget.border"]).toBe("#44454a");
    expect(theme.rules.find((rule) => rule.token === "comment")?.foreground).toBe("aaa79f");
    expect(unreadable(theme)).toEqual([]);
  });
});
