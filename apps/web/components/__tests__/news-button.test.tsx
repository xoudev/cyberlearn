// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The navbar's Nouveautés: a button that opens the release notes over the
 * page, marked until the latest version has been read on this device.
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

const { NewsButton } = await import("../news-button");
const { CHANGELOG_SEEN_EVENT } = await import("../changelog/mark-seen");
const { CHANGELOG_SEEN_KEY, LATEST_VERSION } = await import("@/lib/changelog/entries");

beforeEach(() => {
  dialog.keys.length = 0;
  dialog.open.mockReset();
  localStorage.clear();
});

afterEach(cleanup);

describe("the news button", () => {
  it("starts quiet, named for a screen reader, with nothing to read from storage", () => {
    // What this device has read is only known once mounted: no mark on the
    // first paint, so a reader who has seen the notes gets no flash.
    const html = renderToStaticMarkup(<NewsButton />);
    expect(html).toContain('aria-label="Nouveautés"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("Nouveautés</span>");
    expect(html).not.toContain("news-chip--fresh");
    expect(html).not.toContain("news-chip__dot");
    expect(html).not.toContain("href=");
  });

  it("opens the release notes over the page, by their parameter", () => {
    render(<NewsButton />);
    fireEvent.click(screen.getByRole("button", { name: /Nouveautés/ }));
    expect(dialog.keys).toContain("news");
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it("is marked until the latest version is read, and clears when it is", () => {
    localStorage.setItem(CHANGELOG_SEEN_KEY, "0.1");
    render(<NewsButton />);
    const button = screen.getByRole("button", { name: "Nouveautés, non lues" });
    expect(button.className).toContain("news-chip--fresh");

    act(() => {
      window.dispatchEvent(new CustomEvent(CHANGELOG_SEEN_EVENT, { detail: LATEST_VERSION }));
    });
    expect(screen.getByRole("button", { name: "Nouveautés" }).className).not.toContain(
      "news-chip--fresh",
    );
  });

  it("stays quiet for a reader who has read the latest version", () => {
    localStorage.setItem(CHANGELOG_SEEN_KEY, LATEST_VERSION);
    render(<NewsButton />);
    expect(screen.getByRole("button", { name: "Nouveautés" })).toBeTruthy();
  });
});
