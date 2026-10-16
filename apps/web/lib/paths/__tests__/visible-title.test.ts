import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The tab's title on a path page and its exam: the path's own title only for
 * a reader who may open the path, through the same lookup the page uses.
 */

const m = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  findBySlug: vi.fn<(slug: string, viewerId: string) => Promise<{ title: string } | null>>(),
}));

vi.mock("@/lib/auth", () => ({ getRequestUser: () => m.getRequestUser() }));
vi.mock("@cyberlearn/db", () => ({
  pathRepository: { findBySlug: (slug: string, id: string) => m.findBySlug(slug, id) },
}));

const { visiblePathTitle } = await import("../visible-title");

const READER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  m.getRequestUser.mockResolvedValue({ id: READER });
});

describe("visiblePathTitle", () => {
  it("names a path the reader may open", async () => {
    m.findBySlug.mockResolvedValue({ title: "Les bases du réseau" });
    expect(await visiblePathTitle("reseau-bases")).toBe("Les bases du réseau");
    expect(m.findBySlug).toHaveBeenCalledWith("reseau-bases", READER);
  });

  it("names nothing for a class's path or a draft the reader cannot open", async () => {
    // The lookup is scoped to the reader: a guessed slug finds nothing, and
    // the 404's tab no longer carries the path's real title.
    m.findBySlug.mockResolvedValue(null);
    expect(await visiblePathTitle("revisions-classe-ab12")).toBeNull();
  });

  it("names nothing without a session, and asks nothing of the database", async () => {
    m.getRequestUser.mockResolvedValue(null);
    expect(await visiblePathTitle("reseau-bases")).toBeNull();
    expect(m.findBySlug).not.toHaveBeenCalled();
  });
});
