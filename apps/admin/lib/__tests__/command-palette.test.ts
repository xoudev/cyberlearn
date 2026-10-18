import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchConsoleSearch,
  flattenGroups,
  isConsolePath,
  matchDestinations,
  moveCursor,
  normalize,
  paletteGroups,
  parseSearchResults,
  remoteSearchTerm,
  stripHandle,
  type ConsoleSearchResults,
} from "../command-palette";
import type { ConsoleDestination } from "../console-nav";

/**
 * The quick search's rules without React: what is matched in the browser,
 * when the server is asked, how the answers are grouped and walked through,
 * and what of the server's answer is believed.
 */

const DESTINATIONS: ConsoleDestination[] = [
  { label: "Aperçu", href: "/dashboard", kind: "page", keywords: ["tableau de bord"] },
  { label: "Modération", href: "/moderation", kind: "page", keywords: ["signalements"] },
  { label: "Notes signalées", href: "/moderation/notes", kind: "page", keywords: [] },
  { label: "Nouvelle leçon", href: "/lessons/new", kind: "action", keywords: ["créer"] },
  { label: "Leçons", href: "/lessons", kind: "page", keywords: [] },
];

const hit = (id: string): { id: string; label: string; sublabel: string; href: string } => ({
  id,
  label: `Ligne ${id}`,
  sublabel: "détail",
  href: `/users/${id}`,
});

describe("normalize", () => {
  it("drops case and accents", () => {
    expect(normalize("Modération ÉTÉ")).toBe("moderation ete");
  });
});

describe("remoteSearchTerm", () => {
  it("asks the server from two characters, the @ and the blanks not counted", () => {
    expect(remoteSearchTerm("a")).toBeNull();
    expect(remoteSearchTerm(" @a ")).toBeNull();
    expect(remoteSearchTerm("@am")).toBe("am");
    expect(remoteSearchTerm("  osi ")).toBe("osi");
  });

  it("does not ask past a hundred characters", () => {
    expect(remoteSearchTerm("x".repeat(100))).toHaveLength(100);
    expect(remoteSearchTerm("x".repeat(101))).toBeNull();
  });

  it("reads a handle the way the server does", () => {
    expect(stripHandle("  @ amelie ")).toBe("amelie");
  });
});

describe("matchDestinations", () => {
  const labels = (query: string): string[] =>
    matchDestinations(query, DESTINATIONS).map((d) => d.label);

  it("lists everything when nothing is typed", () => {
    expect(labels("  ")).toHaveLength(DESTINATIONS.length);
  });

  it("matches without the accents", () => {
    expect(labels("moderation")).toEqual(["Modération"]);
    expect(labels("apercu")).toEqual(["Aperçu"]);
  });

  it("matches the keywords too", () => {
    expect(labels("tableau")).toEqual(["Aperçu"]);
  });

  it("wants every word somewhere in the label or the keywords", () => {
    expect(labels("nouvelle creer")).toEqual(["Nouvelle leçon"]);
    expect(labels("nouvelle badge")).toEqual([]);
  });

  it("puts a label that starts with the query first, then one that contains it, then a keyword", () => {
    // "signal": a keyword of Modération, inside "Notes signalées".
    expect(labels("signal")).toEqual(["Notes signalées", "Modération"]);
    expect(labels("lec")).toEqual(["Leçons", "Nouvelle leçon"]);
  });
});

describe("paletteGroups", () => {
  const results: ConsoleSearchResults = {
    users: [hit("u1")],
    lessons: [],
    tickets: [hit("t1"), hit("t2")],
  };

  it("puts the pages first, then the server's finds, and leaves an empty group out", () => {
    const groups = paletteGroups(DESTINATIONS.slice(0, 1), results);
    expect(groups.map((g) => [g.id, g.label, g.items.length])).toEqual([
      ["destinations", "Pages et actions", 1],
      ["users", "Utilisateurs", 1],
      ["tickets", "Tickets", 2],
    ]);
    expect(groups[0]?.items[0]).toEqual({
      key: "page:/dashboard",
      label: "Aperçu",
      href: "/dashboard",
      hint: "page",
    });
    expect(groups[1]?.items[0]).toMatchObject({
      key: "users:u1",
      sublabel: "détail",
      hint: "compte",
    });
  });

  it("shows only the pages before the server has answered", () => {
    expect(paletteGroups(DESTINATIONS, null).map((g) => g.id)).toEqual(["destinations"]);
    expect(paletteGroups([], null)).toEqual([]);
  });

  it("walks every group as one list, in order, with unique keys", () => {
    const flat = flattenGroups(paletteGroups(DESTINATIONS.slice(0, 2), results));
    expect(flat.map((item) => item.key)).toEqual([
      "page:/dashboard",
      "page:/moderation",
      "users:u1",
      "tickets:t1",
      "tickets:t2",
    ]);
  });
});

describe("moveCursor", () => {
  it("stops at both ends", () => {
    expect(moveCursor(0, -1, 3)).toBe(0);
    expect(moveCursor(1, 1, 3)).toBe(2);
    expect(moveCursor(2, 1, 3)).toBe(2);
    expect(moveCursor(5, -1, 3)).toBe(2);
    expect(moveCursor(0, 1, 0)).toBe(0);
  });
});

describe("parseSearchResults", () => {
  it("takes the server's answer as it is", () => {
    const answer = { users: [hit("a")], lessons: [], tickets: [] };
    expect(parseSearchResults(answer)).toEqual(answer);
  });

  it("refuses anything else", () => {
    expect(parseSearchResults(null)).toBeNull();
    expect(parseSearchResults("<!doctype html>")).toBeNull();
    expect(parseSearchResults({ users: [], lessons: [] })).toBeNull();
    expect(parseSearchResults({ users: [{ id: "a" }], lessons: [], tickets: [] })).toBeNull();
  });

  it("only follows a path of this console", () => {
    for (const href of [
      "https://evil.example/x",
      "//evil.example",
      "javascript:alert(1)",
      // The URL parser reads a backslash as a slash, and drops tabs and line breaks.
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "\\\\evil.example",
    ]) {
      expect(isConsolePath(href)).toBe(false);
      expect(
        parseSearchResults({ users: [{ ...hit("a"), href }], lessons: [], tickets: [] }),
      ).toBeNull();
    }
  });
});

describe("isConsolePath", () => {
  it("takes the console's own pages, with their query and fragment", () => {
    for (const href of ["/users/u1", "/lessons/l1/edit", "/tickets?status=OPEN#t1", "/"]) {
      expect(isConsolePath(href)).toBe(true);
    }
  });
});

describe("fetchConsoleSearch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the term in a JSON body, never in the address, and reads the answer", async () => {
    const answer = { users: [], lessons: [hit("l")], tickets: [] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(answer));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    expect(await fetchConsoleSearch("amelie@lycee.fr", signal)).toEqual(answer);
    expect(fetchMock).toHaveBeenCalledWith(
      "/search",
      expect.objectContaining({
        method: "POST",
        signal,
        cache: "no-store",
        body: JSON.stringify({ q: "amelie@lycee.fr" }),
      }),
    );
  });

  it("throws on a refusal, and on a page that is not the answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(fetchConsoleSearch("ab", new AbortController().signal)).rejects.toThrow("400");

    // An expired session lands on the sign-in page, which is HTML.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html>")));
    await expect(fetchConsoleSearch("ab", new AbortController().signal)).rejects.toThrow();
  });
});
