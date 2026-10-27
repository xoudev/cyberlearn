// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_SEARCH_MAX } from "@/lib/lessons/catalog-filters";

/** The catalogue's NIVEAU and STATUT pickers, and its search box. */

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}));

const { CatalogFilterSelect } = await import("../catalog-filter-select");
const { LessonsSearchBar } = await import("../lessons-search-bar");

const LEVELS = [
  { value: "ALL", label: "TOUS", href: "/lessons?category=DEV" },
  { value: "BEGINNER", label: "DÉBUTANT", href: "/lessons?category=DEV&difficulty=BEGINNER" },
  { value: "ADVANCED", label: "AVANCÉ", href: "/lessons?category=DEV&difficulty=ADVANCED" },
];

beforeEach(() => {
  replace.mockClear();
  params = new URLSearchParams();
  // jsdom has no layout: the open list keeps its highlighted option in view.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

describe("CatalogFilterSelect", () => {
  it("offers every level, and goes to the one chosen", () => {
    render(<CatalogFilterSelect label="Niveau" value="ALL" options={LEVELS} />);
    // Named by its label, without the decorative "›" a reader would hear.
    const trigger = screen.getByRole("combobox", { name: "Niveau" });
    expect(trigger.textContent).toContain("TOUS");

    fireEvent.click(trigger);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "TOUS",
      "DÉBUTANT",
      "AVANCÉ",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "AVANCÉ" }));

    expect(replace).toHaveBeenCalledWith("/lessons?category=DEV&difficulty=ADVANCED", {
      scroll: false,
    });
  });

  it("clears the filter with TOUS", () => {
    render(<CatalogFilterSelect label="Niveau" value="BEGINNER" options={LEVELS} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "TOUS" }));
    expect(replace).toHaveBeenCalledWith("/lessons?category=DEV", { scroll: false });
  });

  it("does not navigate to the option already chosen", () => {
    render(<CatalogFilterSelect label="Niveau" value="BEGINNER" options={LEVELS} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "DÉBUTANT" }));
    expect(replace).not.toHaveBeenCalled();
  });

  it("is marked while it narrows the list, and plain while it does not", () => {
    // It used to be the other way round: lit on TOUS, plain once filtering.
    const { rerender } = render(
      <CatalogFilterSelect label="Niveau" value="ALL" options={LEVELS} />,
    );
    expect(
      screen.getByRole("combobox").closest("[data-filtered]")?.getAttribute("data-filtered"),
    ).toBe("false");
    rerender(<CatalogFilterSelect label="Niveau" value="ADVANCED" options={LEVELS} />);
    expect(
      screen.getByRole("combobox").closest("[data-filtered]")?.getAttribute("data-filtered"),
    ).toBe("true");
  });
});

describe("LessonsSearchBar", () => {
  function box(): HTMLInputElement {
    return screen.getByRole<HTMLInputElement>("searchbox");
  }

  it("shows the URL's search", () => {
    params = new URLSearchParams("q=sql");
    render(<LessonsSearchBar />);
    expect(box().value).toBe("sql");
  });

  it("empties once the URL loses its search, as after Réinitialiser les filtres", () => {
    params = new URLSearchParams("q=sql");
    const { rerender } = render(<LessonsSearchBar />);
    params = new URLSearchParams();
    rerender(<LessonsSearchBar />);
    expect(box().value).toBe("");
  });

  it("shows a longer search as the part of it the list applies", () => {
    params = new URLSearchParams({ q: `${"a".repeat(CATALOG_SEARCH_MAX)}bcd` });
    render(<LessonsSearchBar />);
    expect(box().value).toBe("a".repeat(CATALOG_SEARCH_MAX));
  });

  it("puts what is typed in the URL after a pause, back on the first page", () => {
    vi.useFakeTimers();
    render(<LessonsSearchBar />);
    fireEvent.change(box(), { target: { value: "git" } });
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledWith("/lessons?q=git");
  });

  it("keeps the valid filters already in the URL, and drops the page and anything else", () => {
    vi.useFakeTimers();
    render(<LessonsSearchBar />);
    fireEvent.change(box(), { target: { value: "git" } });
    // Chosen while the search waited: read when it fires, not when typed.
    window.history.replaceState(null, "", "/lessons?difficulty=BEGINNER&page=3&status=nope&utm=x");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledWith("/lessons?difficulty=BEGINNER&q=git");
  });

  it("takes its search out of the URL once the box is emptied", () => {
    vi.useFakeTimers();
    params = new URLSearchParams("category=DEV&q=sql");
    window.history.replaceState(null, "", "/lessons?category=DEV&q=sql");
    render(<LessonsSearchBar />);
    fireEvent.change(box(), { target: { value: "" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledWith("/lessons?category=DEV");
  });

  it("keeps what the reader typed on while their own search travelled", () => {
    vi.useFakeTimers();
    const { rerender } = render(<LessonsSearchBar />);
    fireEvent.change(box(), { target: { value: "git" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.change(box(), { target: { value: "git rebase" } });
    // The URL catches up with the first search: an echo, not a reset.
    params = new URLSearchParams("q=git");
    rerender(<LessonsSearchBar />);
    expect(box().value).toBe("git rebase");
  });
});
