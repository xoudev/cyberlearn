// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The site's right-click menu: what it offers depends on what is under the
 * pointer, and it gives the browser its own menu back wherever that one is
 * needed (typing, Shift, a touch screen, a surface with a menu of its own).
 */

const push = vi.fn();
const back = vi.fn();
const forward = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back, forward }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { SiteContextMenu, keepsBrowserMenu, siteMenuEntries } = await import("../site-context-menu");
const { SEARCH_EVENT, ADD_TO_NOTES_EVENT } = await import("@/lib/site-events");

const noop = (): void => undefined;
const actions = {
  navigate: vi.fn(),
  openInNewTab: vi.fn(),
  copy: vi.fn(),
  search: vi.fn(),
  addToNotes: vi.fn(),
  back: noop,
  forward: noop,
  reload: noop,
  pageUrl: () => "https://cyberlearn.fr/notes",
};
const base = { link: null, image: null, selection: "", canAddToNotes: false, canSearch: false };

const ids = (entries: ReturnType<typeof siteMenuEntries>): string[] =>
  entries.filter((e) => e.kind === "item").map((e) => e.id);

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  document.body.removeAttribute("data-add-to-notes");
  window.getSelection()?.removeAllRanges();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("siteMenuEntries", () => {
  it("offers the page's own moves anywhere", () => {
    expect(ids(siteMenuEntries(base, actions))).toEqual(["back", "forward", "reload", "page-copy"]);
  });

  it("puts what is under the pointer first: a link, an image, a selection", () => {
    const entries = siteMenuEntries(
      {
        ...base,
        link: { href: "https://cyberlearn.fr/lessons/osi", sameOrigin: true },
        image: { src: "https://cyberlearn.fr/a.png" },
        selection: "le modèle OSI",
        canAddToNotes: true,
        canSearch: true,
      },
      actions,
    );
    expect(ids(entries)).toEqual([
      "link-open",
      "link-tab",
      "link-copy",
      "image-tab",
      "image-copy",
      "sel-copy",
      "sel-note",
      "sel-search",
      "back",
      "forward",
      "reload",
      "page-copy",
    ]);
  });

  it("offers notes and search only where they can answer", () => {
    const entries = siteMenuEntries({ ...base, selection: "x" }, actions);
    expect(ids(entries)).not.toContain("sel-note");
    expect(ids(entries)).not.toContain("sel-search");
    expect(ids(siteMenuEntries({ ...base, canSearch: true }, actions))).toContain("search");
  });

  it("hands the selection to what each entry does", () => {
    const entries = siteMenuEntries(
      { ...base, selection: "UNION SELECT", canAddToNotes: true, canSearch: true },
      actions,
    );
    const run = (id: string): void => {
      const entry = entries.find((e) => e.kind === "item" && e.id === id);
      if (entry?.kind === "item") entry.onSelect();
    };
    run("sel-copy");
    run("sel-note");
    run("sel-search");
    expect(actions.copy).toHaveBeenCalledWith("UNION SELECT", "Texte copié.");
    expect(actions.addToNotes).toHaveBeenCalledWith("UNION SELECT");
    expect(actions.search).toHaveBeenCalledWith("UNION SELECT");
  });
});

describe("keepsBrowserMenu", () => {
  const at = (el: Element, init: MouseEventInit = {}): MouseEvent => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, ...init });
    Object.defineProperty(event, "target", { value: el });
    return event;
  };

  it("gives the browser its menu where one types, with Shift, or when a surface took the click", () => {
    document.body.innerHTML =
      '<input id="i"/><textarea id="t"></textarea><div class="cm-editor"><div id="cm"></div></div><p id="p">x</p><div data-native-contextmenu><span id="n"></span></div>';
    const el = (id: string): Element => document.getElementById(id) as Element; // ids written above
    expect(keepsBrowserMenu(at(el("i")))).toBe(true);
    expect(keepsBrowserMenu(at(el("t")))).toBe(true);
    expect(keepsBrowserMenu(at(el("cm")))).toBe(true);
    expect(keepsBrowserMenu(at(el("n")))).toBe(true);
    expect(keepsBrowserMenu(at(el("p"), { shiftKey: true }))).toBe(true);
    const taken = at(el("p"));
    taken.preventDefault();
    expect(keepsBrowserMenu(taken)).toBe(true);
    expect(keepsBrowserMenu(at(el("p")))).toBe(false);
  });
});

describe("SiteContextMenu", () => {
  it("opens on a right click on a link, and goes there from « Ouvrir le lien »", () => {
    render(
      <>
        {/* A plain link on purpose: the menu reads any <a href>, Link renders one. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/lessons/osi">Le modèle OSI</a>
        <SiteContextMenu />
      </>,
    );
    fireEvent.contextMenu(screen.getByText("Le modèle OSI"), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Ouvrir le lien" }));
    expect(push).toHaveBeenCalledWith("/lessons/osi");
  });

  it("stays shut where a surface opened its own menu", () => {
    render(
      <>
        <div
          onContextMenu={(e) => {
            e.preventDefault();
          }}
        >
          Carte
        </div>
        <SiteContextMenu />
      </>,
    );
    fireEvent.contextMenu(screen.getByText("Carte"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("asks the search and the lesson's notes through window events", () => {
    const searched = vi.fn();
    const added = vi.fn();
    window.addEventListener(SEARCH_EVENT, searched);
    window.addEventListener(ADD_TO_NOTES_EVENT, added);
    document.body.setAttribute("data-add-to-notes", "");
    render(
      <>
        <div data-global-search="" />
        <article className="lesson-content">
          <p>Une requête préparée sépare le code des données.</p>
        </article>
        <SiteContextMenu />
      </>,
    );
    const text = screen.getByText(/Une requête préparée/);
    const range = document.createRange();
    range.selectNodeContents(text);
    act(() => {
      window.getSelection()?.addRange(range);
    });
    fireEvent.contextMenu(text);
    fireEvent.click(screen.getByRole("menuitem", { name: "Ajouter à mes notes" }));
    expect(added).toHaveBeenCalledTimes(1);

    // jsdom drops the selection when the menu takes the focus; a browser keeps it.
    act(() => {
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    });
    fireEvent.contextMenu(text);
    fireEvent.click(screen.getByRole("menuitem", { name: /^Rechercher « / }));
    expect(searched).toHaveBeenCalledTimes(1);
    window.removeEventListener(SEARCH_EVENT, searched);
    window.removeEventListener(ADD_TO_NOTES_EVENT, added);
  });
});
