import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A path's cover: an image uploaded from the console first, then the path's
 * own illustration, then its category's. A file the code names must exist,
 * and an illustration nobody names is dead weight.
 */

const { signMany, findMany } = vi.hoisted(() => ({ signMany: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/lesson-cover/storage", () => ({ resolveLessonCoverSrcMany: signMany }));
vi.mock("@cyberlearn/db", () => ({
  prisma: { path: { findMany } },
  pathsVisibleTo: (userId: string) => ({ visibleTo: userId }),
}));

const { builtInPathCover, resolvePathCovers, visiblePathCovers } = await import("../cover");

const COVERS = path.resolve(__dirname, "../../../public/covers/paths");

beforeEach(() => {
  findMany.mockReset();
  signMany.mockReset();
  signMany.mockImplementation((values: (string | null)[]) =>
    Promise.resolve(values.map((v) => (v === null ? null : `https://x.supabase.co/signed/${v}`))),
  );
});

describe("a path's built-in cover", () => {
  it("is its own illustration when it has one, else its category's", () => {
    expect(builtInPathCover({ slug: "linux", category: "DEV" })).toBe("/covers/paths/linux.svg");
    expect(builtInPathCover({ slug: "nouveau-parcours", category: "NETWORK" })).toBe(
      "/covers/paths/category-network.svg",
    );
    expect(builtInPathCover({ slug: "nouveau-parcours", category: "AUTRE" })).toBe(
      "/covers/paths/category-dev.svg",
    );
  });

  it("names only files that ship, and every file it ships is named", () => {
    const files = readdirSync(COVERS).filter((f) => f.endsWith(".svg"));
    const named = new Set<string>();
    for (const file of files) {
      const slug = file.replace(/\.svg$/u, "");
      const src = slug.startsWith("category-")
        ? builtInPathCover({ slug: "aucun", category: slug.slice(9).toUpperCase() })
        : builtInPathCover({ slug, category: "DEV" });
      named.add(src);
      expect(src, file).toBe(`/covers/paths/${file}`);
    }
    for (const src of named) {
      expect(existsSync(path.join(COVERS, path.basename(src))), src).toBe(true);
    }
    expect(files.length).toBe(22);
  });
});

describe("resolvePathCovers", () => {
  it("signs an uploaded cover, and falls back to the illustration otherwise", async () => {
    const covers = await resolvePathCovers([
      { slug: "linux", category: "DEV", coverImageUrl: "__cover:abc.webp" },
      { slug: "linux", category: "DEV", coverImageUrl: null },
      // Pasted before uploads existed: the CSP would block it, so it is not used.
      { slug: "osint", category: "CYBERSEC", coverImageUrl: "https://example.com/a.png" },
    ]);
    expect(covers).toEqual([
      "https://x.supabase.co/signed/__cover:abc.webp",
      "/covers/paths/linux.svg",
      "/covers/paths/osint.svg",
    ]);
    expect(signMany).toHaveBeenCalledWith(["__cover:abc.webp", null, null]);
  });

  it("shows the illustration when an upload cannot be signed", async () => {
    signMany.mockResolvedValue([null]);
    const covers = await resolvePathCovers([
      { slug: "pentest", category: "CYBERSEC", coverImageUrl: "__cover:gone.webp" },
    ]);
    expect(covers).toEqual(["/covers/paths/pentest.svg"]);
  });
});

describe("visiblePathCovers", () => {
  it("reads only the paths this reader may open, and gives both covers of each", async () => {
    findMany.mockResolvedValue([
      { slug: "linux", category: "DEV", coverImageUrl: "__cover:abc.webp" },
      { slug: "parcours-de-classe", category: "NETWORK", coverImageUrl: null },
    ]);
    const covers = await visiblePathCovers("user-1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visibleTo: "user-1" } }),
    );
    expect(covers).toEqual([
      {
        slug: "linux",
        image: "https://x.supabase.co/signed/__cover:abc.webp",
        illustration: "/covers/paths/linux.svg",
      },
      {
        slug: "parcours-de-classe",
        image: null,
        illustration: "/covers/paths/category-network.svg",
      },
    ]);
  });
});
