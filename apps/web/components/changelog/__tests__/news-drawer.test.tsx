// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHANGELOG,
  CHANGELOG_SEEN_KEY,
  LATEST_VERSION,
  formatChangelogDate,
  type ChangelogEntry,
} from "@/lib/changelog/entries";
import { ChangelogTimeline } from "../changelog-timeline";
import { CHANGELOG_SEEN_EVENT } from "../mark-seen";
import NewsDrawer from "../news-drawer";

/**
 * The release notes in their drawer: the one rendering of the list, and the
 * read it records on this device when it opens, as the /changelog page did.
 */

const ENTRIES: ChangelogEntry[] = [
  {
    version: "9.1",
    date: "2026-10-12",
    title: "La dernière",
    changes: [
      { type: "new", text: "Une chose nouvelle." },
      { type: "fixed", text: "Une chose réparée." },
    ],
  },
  {
    version: "9.0",
    date: "2026-10-01",
    title: "La précédente",
    changes: [{ type: "improved", text: "Une chose mieux faite." }],
  },
];

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe("ChangelogTimeline", () => {
  it("lists the versions newest first, the first one marked as the latest", () => {
    render(<ChangelogTimeline entries={ENTRIES} />);
    const items = screen.getAllByRole("listitem").filter((li) => li.className === "news-entry");
    expect(items.map((li) => li.getAttribute("data-latest"))).toEqual(["true", "false"]);
    const [latest, previous] = items;
    if (latest === undefined || previous === undefined) throw new Error("two versions expected");
    expect(within(latest).getByText("Dernière version")).toBeTruthy();
    expect(within(previous).queryByText("Dernière version")).toBeNull();
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "La dernière",
      "La précédente",
    ]);
  });

  it("dates each version, and marks each change with its kind", () => {
    render(<ChangelogTimeline entries={ENTRIES} />);
    const date = screen.getByText(formatChangelogDate("2026-10-12"));
    expect(date.tagName).toBe("TIME");
    expect(date.getAttribute("datetime")).toBe("2026-10-12");
    expect(screen.getByText("v9.1")).toBeTruthy();
    expect(screen.getByText("Nouveau").nextElementSibling?.textContent).toBe("Une chose nouvelle.");
    expect(screen.getByText("Correctif").nextElementSibling?.textContent).toBe(
      "Une chose réparée.",
    );
    expect(screen.getByText("Amélioration")).toBeTruthy();
  });
});

describe("NewsDrawer", () => {
  it("draws every release of the site, in a drawer named for them", () => {
    render(<NewsDrawer value="1" onClose={vi.fn()} />);
    const drawer = screen.getByRole("dialog", { name: "Nouveautés" });
    expect(
      within(drawer).getByText(`v${LATEST_VERSION}`, { selector: ".side-drawer__meta" }),
    ).toBeTruthy();
    expect(within(drawer).getAllByRole("heading")).toHaveLength(CHANGELOG.length);
  });

  it("records the latest version as read on this device, and says so in the tab", () => {
    const heard = vi.fn();
    window.addEventListener(CHANGELOG_SEEN_EVENT, heard);
    render(<NewsDrawer value="1" onClose={vi.fn()} />);
    window.removeEventListener(CHANGELOG_SEEN_EVENT, heard);
    expect(localStorage.getItem(CHANGELOG_SEEN_KEY)).toBe(LATEST_VERSION);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("closes from its button", () => {
    const onClose = vi.fn();
    render(<NewsDrawer value="1" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer les nouveautés" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
