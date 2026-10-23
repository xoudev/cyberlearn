import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReadLesson from "../read-lesson";

/**
 * Every lesson was called "Leçon · CyberLearn" in the tab, because the title
 * could not be read from the slug alone: that would put the name of a
 * class-only lesson in the tab of anyone who guessed its address. It comes from
 * the page's own reader-scoped read now, cached for the request, so the tab
 * says what the page says and costs no query.
 */

const m = vi.hoisted(() => ({
  findBySlug: vi.fn(),
  findBySlugForReview: vi.fn(),
  unlocksEveryLesson: vi.fn(),
  getRequestUser: vi.fn(),
}));

// React's cache memoizes per request on the server; outside one it does not
// memoize at all. A per-test memo stands in for the request, to show that the
// read goes through it.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  function cache<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    const seen = new Map<string, R>();
    const memo = (...args: A): R => {
      const key = JSON.stringify(args);
      if (!seen.has(key)) seen.set(key, fn(...args));
      return seen.get(key) as R; // set on the line above when missing
    };
    return memo;
  }
  return { ...actual, cache };
});
vi.mock("@cyberlearn/db", () => ({
  lessonRepository: {
    findBySlug: m.findBySlug,
    findBySlugForReview: m.findBySlugForReview,
  },
}));
vi.mock("@/lib/lessons/access", () => ({ unlocksEveryLesson: m.unlocksEveryLesson }));
vi.mock("@/lib/auth", () => ({ getRequestUser: m.getRequestUser }));

/**
 * The module afresh for each test: the memo of the cache above is the request,
 * and a test must not be answered from the one before.
 */
async function load(): Promise<typeof ReadLesson> {
  vi.resetModules();
  return import("../read-lesson");
}

const PUBLISHED = { id: "l1", slug: "adresses-ip", title: "Les adresses IP" };
const DRAFT = { id: "l2", slug: "brouillon", title: "Un brouillon en cours", status: "DRAFT" };

beforeEach(() => {
  vi.clearAllMocks();
  m.getRequestUser.mockResolvedValue({ id: "u1" });
  m.findBySlug.mockResolvedValue(null);
  m.findBySlugForReview.mockResolvedValue(null);
  m.unlocksEveryLesson.mockResolvedValue(false);
});

describe("readLesson", () => {
  it("reads the lesson for the reader, by slug", async () => {
    const { readLesson } = await load();
    m.findBySlug.mockResolvedValue(PUBLISHED);
    const read = await readLesson("adresses-ip", "u1");

    expect(read).toEqual({ lesson: PUBLISHED, reviewing: false });
    expect(m.findBySlug).toHaveBeenCalledWith("adresses-ip", "u1");
    // Nothing else is asked for a lesson the reader may open.
    expect(m.unlocksEveryLesson).not.toHaveBeenCalled();
    expect(m.findBySlugForReview).not.toHaveBeenCalled();
  });

  it("finds nothing where the reader has no lesson, and a draft stays unread", async () => {
    const { readLesson } = await load();
    const read = await readLesson("brouillon", "u1");

    expect(read).toEqual({ lesson: null, reviewing: false });
    expect(m.unlocksEveryLesson).toHaveBeenCalledWith("u1");
    expect(m.findBySlugForReview).not.toHaveBeenCalled();
  });

  it("opens a draft to an administrator, and says it is a review", async () => {
    const { readLesson } = await load();
    m.unlocksEveryLesson.mockResolvedValue(true);
    m.findBySlugForReview.mockResolvedValue(DRAFT);

    expect(await readLesson("brouillon", "admin")).toEqual({ lesson: DRAFT, reviewing: true });
    expect(m.findBySlugForReview).toHaveBeenCalledWith("brouillon");
  });

  it("finds nothing for an administrator at an address with no lesson at all", async () => {
    const { readLesson } = await load();
    m.unlocksEveryLesson.mockResolvedValue(true);

    expect(await readLesson("inconnue", "admin")).toEqual({ lesson: null, reviewing: false });
  });

  it("asks the database once for the page and the title together", async () => {
    const { lessonTabTitle, readLesson } = await load();
    m.findBySlug.mockResolvedValue(PUBLISHED);
    // The page and generateMetadata start together in the same request.
    const [page, title] = await Promise.all([
      readLesson("adresses-ip", "u1"),
      lessonTabTitle("adresses-ip"),
    ]);

    expect(page.lesson).toEqual(PUBLISHED);
    expect(title).toBe("Les adresses IP");
    expect(m.findBySlug).toHaveBeenCalledTimes(1);
  });
});

describe("lessonTabTitle", () => {
  it("is the lesson's own title", async () => {
    const { lessonTabTitle } = await load();
    m.findBySlug.mockResolvedValue(PUBLISHED);

    expect(await lessonTabTitle("adresses-ip")).toBe("Les adresses IP");
  });

  it("does not name a lesson the reader may not open, the title of a class's own included", async () => {
    const { LESSON_TAB_TITLE, lessonTabTitle } = await load();
    // findBySlug is scoped to the reader: a class-only lesson comes back null
    // for anyone outside the class, whatever slug they guessed.
    m.findBySlug.mockResolvedValue(null);

    expect(await lessonTabTitle("lecon-de-la-classe")).toBe(LESSON_TAB_TITLE);
    expect(m.findBySlug).toHaveBeenCalledWith("lecon-de-la-classe", "u1");
  });

  it("names a draft to an administrator only", async () => {
    const { LESSON_TAB_TITLE, lessonTabTitle } = await load();
    m.findBySlugForReview.mockResolvedValue(DRAFT);

    expect(await lessonTabTitle("brouillon")).toBe(LESSON_TAB_TITLE);
    m.unlocksEveryLesson.mockResolvedValue(true);
    m.getRequestUser.mockResolvedValue({ id: "admin" });
    expect(await lessonTabTitle("brouillon")).toBe("Un brouillon en cours");
  });

  it("names nothing to somebody who is not signed in, and reads nothing", async () => {
    const { lessonTabTitle } = await load();
    m.getRequestUser.mockResolvedValue(null);

    expect(await lessonTabTitle("adresses-ip")).toBe("Leçon");
    expect(m.findBySlug).not.toHaveBeenCalled();
  });
});
