import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** The questionnaire from the catalogue: reads only, links to the paths. */

vi.mock("@/lib/auth", () => ({ requireRequestUser: () => Promise.resolve({ id: "user-1" }) }));

const prefsFindUnique = vi.fn();
const pathFindMany = vi.fn();
const upsert = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    userPreferences: { findUnique: prefsFindUnique, upsert },
    path: { findMany: pathFindMany },
  },
}));

const { default: PathGuidePage } = await import("../page");

beforeEach(() => {
  prefsFindUnique.mockResolvedValue(null);
  upsert.mockReset();
  pathFindMany.mockReset();
  pathFindMany.mockResolvedValue([
    {
      slug: "reseaux-tcp-ip",
      title: "Réseaux TCP/IP",
      description: "",
      category: "NETWORK",
      track: "SKILL",
      difficulty: "BEGINNER",
      estimatedHours: 8,
      refCode: "CL-PATH-004",
      avgRating: 4.5,
      _count: { lessons: 12 },
    },
  ]);
});

async function render(query: Record<string, string | string[]> = {}): Promise<string> {
  const element = await PathGuidePage({ searchParams: Promise.resolve(query) });
  return renderToStaticMarkup(element);
}

describe("/paths/guide", () => {
  it("asks the questions without reading the catalogue", async () => {
    const html = await render();
    expect(html).toContain('action="/paths/guide" method="get"');
    expect(html).toContain("Voir mes suggestions");
    expect(pathFindMany).not.toHaveBeenCalled();
  });

  it("links each suggestion to its path, and records nothing", async () => {
    const html = await render({ goals: "NETWORK", level: "NEW" });
    expect(html).toContain('href="/paths/reseaux-tcp-ip"');
    expect(html).toContain("Réseaux TCP/IP");
    expect(html).toContain("12 missions");
    expect(html).toContain("★ 4,5");
    expect(html).toContain('href="/paths/guide?goals=NETWORK&amp;level=NEW&amp;edit=1"');
    expect(upsert).not.toHaveBeenCalled();
  });

  it("says so when nothing published fits", async () => {
    pathFindMany.mockResolvedValue([]);
    const html = await render({ goals: "DEV", level: "PRACTICING" });
    expect(html).toContain("Aucun parcours publié ne correspond encore à ces réponses.");
    expect(html).toContain('href="/paths"');
  });
});
