import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Step 3 of the onboarding: what brings you here, then two or three paths.
 * A tester's remark: arriving with no background, the only thing offered was
 * a knowledge test, then sixteen paths and no idea where to start.
 */

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser } }),
}));

const userFindUnique = vi.fn();
const prefsFindUnique = vi.fn();
const pathFindMany = vi.fn();
const upsert = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    userPreferences: { findUnique: prefsFindUnique, upsert },
    path: { findMany: pathFindMany },
  },
}));

vi.mock("@/lib/onboarding/finalize", () => ({ setOnboardingComplete: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { default: OnboardingGoalsPage } = await import("../page");

const row = (slug: string, title: string, category: string, difficulty: string, ref: string) => ({
  slug,
  title,
  description: "",
  category,
  track: "SKILL",
  difficulty,
  estimatedHours: 6,
  refCode: ref,
  avgRating: null,
  _count: { lessons: 10 },
});

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  userFindUnique.mockResolvedValue({ username: "camille" });
  prefsFindUnique.mockResolvedValue(null);
  upsert.mockReset();
  pathFindMany.mockResolvedValue([
    row("python-bases", "Python : les bases", "DEV", "BEGINNER", "CL-PATH-001"),
    row("cyber-bases", "Cybersécurité : les fondamentaux", "CYBERSEC", "BEGINNER", "CL-PATH-002"),
    row("pentest", "Pentest web", "CYBERSEC", "ADVANCED", "CL-PATH-003"),
  ]);
});

async function render(query: Record<string, string | string[]> = {}): Promise<string> {
  const element = await OnboardingGoalsPage({ searchParams: Promise.resolve(query) });
  return renderToStaticMarkup(element);
}

describe("the onboarding goals step", () => {
  it("sends back to the first step somebody without a username", async () => {
    userFindUnique.mockResolvedValue({ username: null });
    await expect(render()).rejects.toThrow("REDIRECT /onboarding");
  });

  it("asks the two questions, with examples, as a form that needs no script", async () => {
    const html = await render();
    expect(html).toContain('action="/onboarding/goals" method="get"');
    expect(html).toContain('type="checkbox" name="goals" value="CYBERSEC"');
    expect(html).toContain('type="radio" required="" name="level" value="NEW"');
    expect(html).toContain("Par exemple : Savoir comment on attaque un site");
    expect(html).toContain("Passer, j&#x27;explore seul");
  });

  it("marks the third step as the current one, named Objectif", async () => {
    const html = await render();
    expect(html).toMatch(/data-state="current" aria-current="step">Objectif</);
    expect(html).not.toContain("Positionnement");
  });

  it("ticks the answers given earlier", async () => {
    prefsFindUnique.mockResolvedValue({ learningGoals: ["NETWORK"], startingLevel: "SOME" });
    const html = await render();
    expect(html).toContain('name="goals" checked="" value="NETWORK"');
    expect(html).toContain('name="level" checked="" value="SOME"');
    expect(html).not.toContain('checked="" value="DEV"');
  });

  it("says what is missing instead of suggesting", async () => {
    const html = await render({ level: "NEW" });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Coche au moins une réponse à la première question.");
  });

  it("suggests paths with their reason, each starting through the server", async () => {
    const html = await render({ goals: ["DEV", "CYBERSEC"], level: "NEW" });
    expect(html).toContain("Python : les bases");
    expect(html).toContain("Cybersécurité : les fondamentaux");
    // A beginner is not sent to an advanced path.
    expect(html).not.toContain("Pentest web");
    expect(html).toContain("Sans prérequis : le point de départ en développement.");
    expect(html).toContain('name="slug" value="python-bases"');
    expect(html).toContain('name="to" value="path"');
    expect(html).toContain("Voir tout le catalogue");
    expect(html).toContain(
      "/onboarding/goals?goals=DEV&amp;goals=CYBERSEC&amp;level=NEW&amp;edit=1",
    );
    // Showing suggestions records nothing: only a button does.
    expect(upsert).not.toHaveBeenCalled();
  });

  it("offers the placement test to somebody who has a base, not to a beginner", async () => {
    const beginner = await render({ goals: "DEV", level: "NEW" });
    expect(beginner).not.toContain("Faire le test de positionnement");
    const some = await render({ goals: "DEV", level: "SOME" });
    expect(some).toContain("Faire le test de positionnement");
    expect(some).toContain('name="to" value="placement"');
  });
});
