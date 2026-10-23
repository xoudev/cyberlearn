import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MOBILE_BREAKPOINT } from "@/hooks/use-mobile";
import { cssBlock, cssValue, mediaRule } from "@/test/css";

/**
 * While the sidebar streams in, a placeholder stands in its place. It was a
 * 240px column at every width, but on a phone the sidebar is a drawer out of
 * the flow and holds no room: the page had 135px of a 375px screen until the
 * sidebar arrived, and Chrome mobile widened its layout window to fit
 * (522px measured on /paths/linux when the stream was slow).
 *
 * The shell is an async server component that reads cookies and the session,
 * and layout does not exist in jsdom, so its markup and the stylesheet are
 * read rather than rendered.
 *
 * The placeholder holds the column from the breakpoint where the sidebar is a
 * column in the flow: 1024px (the drawer media query of .sidebar-wrapper ends
 * at 1023px, MOBILE_BREAKPOINT in hooks/use-mobile.ts), not Tailwind's md.
 * Between 768 and 1023px the sidebar is a drawer, out of the flow.
 */

const SHELL = readFileSync(path.resolve(__dirname, "../app-shell.tsx"), "utf8");
const SHEET = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

describe("the sidebar's placeholder in the app shell", () => {
  it("is drawn from a class, not from an inline width", () => {
    const fallback = /<Suspense fallback=\{<div ([^>]*)\/>\}>\s*<AppSidebar \/>/u.exec(SHELL)?.[1];
    expect(fallback).toBeDefined();
    expect(fallback).toContain('className="sidebar-fallback"');
    expect(fallback).not.toContain("style=");
  });

  it("holds no room by default, so a phone keeps the whole width", () => {
    const rule = cssBlock(SHEET, ".sidebar-fallback");
    if (rule === undefined) throw new Error("no .sidebar-fallback rule");
    expect(cssValue(rule, "display")).toBe("none");
    expect(cssValue(rule, "width")).toBeUndefined();
  });

  it("holds the column's 240px only where the sidebar is a column", () => {
    const condition = `(min-width: ${String(MOBILE_BREAKPOINT)}px)`;
    const rule = mediaRule(SHEET, condition, ".sidebar-fallback");
    if (rule === undefined) throw new Error(`no .sidebar-fallback rule under ${condition}`);
    expect(cssValue(rule, "display")).toBe("block");
    expect(cssValue(rule, "width")).toBe("240px");
    expect(cssValue(rule, "flex-shrink")).toBe("0");
  });

  it("takes the column the moment the sidebar's drawer stops", () => {
    const drawer = mediaRule(
      SHEET,
      `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`,
      ".sidebar-wrapper",
    );
    if (drawer === undefined) throw new Error("no sidebar drawer rule");
    expect(cssValue(drawer, "position")).toBe("fixed");
  });
});
