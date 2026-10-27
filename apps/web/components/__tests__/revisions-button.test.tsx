// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The navbar's "Révisions du jour". It was an entry of the sidebar, among the
 * pages, though it opens a window over the page being read (?rappel=1): it
 * sits next to the bell now, on screen on a phone as well.
 */

const dialog = vi.hoisted(() => ({
  keys: [] as string[],
  open: vi.fn<(value?: string) => void>(),
}));

// The hook and the host are covered once (query-dialog-host.test.tsx): here,
// only which window the button asks for.
vi.mock("@/hooks/use-query-dialog", () => ({
  useQueryDialog: (key: string) => {
    dialog.keys.push(key);
    return { value: null, open: dialog.open, close: vi.fn() };
  },
}));

const { RevisionsButton } = await import("../revisions-button");

beforeEach(() => {
  dialog.keys.length = 0;
  dialog.open.mockReset();
});

afterEach(cleanup);

describe("the navbar's revisions button", () => {
  it("opens the day's recall over the page, without leading anywhere", () => {
    render(<RevisionsButton waiting={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Révisions du jour" }));

    expect(dialog.keys).toContain("rappel");
    expect(dialog.open).toHaveBeenCalledWith("1");
  });

  it("is a button that says it opens a window, not a link", () => {
    const html = renderToStaticMarkup(<RevisionsButton waiting={false} />);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("href=");
  });

  it("marks a day's recall that waits, and says so to a screen reader", () => {
    const html = renderToStaticMarkup(<RevisionsButton waiting />);
    expect(html).toContain('aria-label="Révisions du jour, rappel à faire"');
    expect(html).toContain("navbar-revisions__mark");
  });

  it("draws no mark once the day's recall is done or has nothing to ask", () => {
    const html = renderToStaticMarkup(<RevisionsButton waiting={false} />);
    expect(html).toContain('aria-label="Révisions du jour"');
    expect(html).not.toContain("navbar-revisions__mark");
  });

  it("never writes a number: a count that grows while one is away keeps one away", () => {
    for (const waiting of [false, true]) {
      const text = renderToStaticMarkup(<RevisionsButton waiting={waiting} />).replace(
        /<[^>]*>/gu,
        "",
      );
      expect(text).not.toMatch(/\d/u);
    }
  });
});
