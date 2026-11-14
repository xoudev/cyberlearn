import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPathDetail } from "@cyberlearn/db";

/**
 * One path's public page: what a visitor and a crawler read of it, and what
 * they do not. The data and the session are stubbed.
 */

const db = vi.hoisted(() => ({
  statsRepository: { findPublicPath: vi.fn<(slug: string) => Promise<PublicPathDetail | null>>() },
}));
vi.mock("@cyberlearn/db", () => db);

const auth = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getActiveBan: vi.fn<() => Promise<{ id: string } | null>>(),
}));
vi.mock("@/lib/auth", () => auth);
vi.mock("@/components/brand-typeface", () => ({ brandTypeface: "test-brand-typeface" }));

class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect ${to}`);
  }
}
class NotFound extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
  notFound: () => {
    throw new NotFound();
  },
}));

const { default: PublicPathPage, generateMetadata } = await import("../page");

const PATH: PublicPathDetail = {
  slug: "pentest",
  refCode: "CL-PATH-010-V01",
  title: "Pentest : les bases",
  description: "Reconnaître, exploiter, rendre compte.",
  category: "CYBERSEC",
  track: "CAREER",
  difficulty: "INTERMEDIATE",
  estimatedHours: 12,
  lessons: 3,
  xp: 450,
  hasCertificate: true,
  hasExam: true,
  rating: { avg: 4.46, count: 12 },
  coverImageUrl: null,
  modules: [
    {
      id: "m1",
      position: 1,
      title: "Reconnaissance",
      description: "Avant de toucher à quoi que ce soit.",
    },
    { id: "m2", position: 2, title: "Exploitation", description: null },
  ],
  programme: [
    {
      title: "Cartographier une cible",
      description: "Nmap et ses sorties.",
      estimatedMinutes: 45,
      moduleId: "m1",
    },
    {
      title: "Lire un service exposé",
      description: "Bannières et versions.",
      estimatedMinutes: 90,
      moduleId: "m1",
    },
    {
      title: "Une première injection",
      description: "SQL, pas à pas.",
      estimatedMinutes: 60,
      moduleId: "m2",
    },
  ],
  updatedAt: new Date("2026-11-01T10:00:00Z"),
};

function page(slug: string): Promise<React.JSX.Element> {
  return PublicPathPage({ params: Promise.resolve({ slug }) });
}

async function html(slug = "pentest"): Promise<string> {
  return renderToStaticMarkup(await page(slug));
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getRequestUser.mockResolvedValue(null);
  auth.getActiveBan.mockResolvedValue(null);
  db.statsRepository.findPublicPath.mockResolvedValue(PATH);
});

describe("a path's public page", () => {
  it("names the path, what it takes and what it ends with", async () => {
    const markup = await html();

    expect(markup).toContain("<h1");
    expect(markup).toContain("Pentest : les bases");
    expect(markup).toContain("Cybersécurité");
    expect(markup).toContain("Intermédiaire");
    expect(markup).toContain("12 h environ");
    expect(markup).toContain("Un examen, puis un certificat vérifiable");
    expect(markup).toContain("Noté 4,5 sur 5 par 12 apprenants.");
  });

  it("lists the programme module by module, lessons numbered across the path", async () => {
    const markup = await html();

    expect(markup).toContain("Module 01");
    expect(markup).toContain("Reconnaissance");
    expect(markup).toContain("Module 02");
    expect(markup.indexOf("Cartographier une cible")).toBeLessThan(
      markup.indexOf("Une première injection"),
    );
    expect(markup).toContain("45 min");
    expect(markup).toContain("1 h 30");
    expect(markup).toContain("1 h<");
    // The third lesson is 03, though it is the first of its module.
    expect(markup).toMatch(/>03<\/span>.*Une première injection/su);
  });

  it("offers the sign-up, and the catalogue to go back to", async () => {
    const markup = await html();

    expect(markup).toContain('href="/register"');
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/catalogue"');
    // Never a lesson's own address: it would answer a visitor with the login.
    expect(markup).not.toContain('href="/lessons');
  });

  it("describes the path as a course to search engines, without letting a title end the block", async () => {
    db.statsRepository.findPublicPath.mockResolvedValue({
      ...PATH,
      title: "</script><script>alert(1)</script>",
    });
    const markup = await html();
    const block = /<script type="application\/ld\+json">(.*?)<\/script>/su.exec(markup)?.[1];

    expect(block).toBeDefined();
    expect(block).not.toContain("<");
    const data: unknown = JSON.parse(block ?? "{}");
    expect(data).toMatchObject({
      "@type": "Course",
      name: "</script><script>alert(1)</script>",
      url: "https://cyberlearn.fr/catalogue/pentest",
      timeRequired: "PT12H",
      aggregateRating: { ratingValue: 4.5, ratingCount: 12 },
    });
  });

  it("says the programme is on its way for a path with no lesson published yet", async () => {
    db.statsRepository.findPublicPath.mockResolvedValue({
      ...PATH,
      lessons: 0,
      xp: 0,
      programme: [],
    });
    expect(await html()).toContain("Le programme de ce parcours arrive bientôt.");
  });
});

describe("who reads it", () => {
  it("sends somebody signed in to the path's own page, with their progress", async () => {
    auth.getRequestUser.mockResolvedValue({ id: "u1" });

    await expect(page("pentest")).rejects.toMatchObject({ to: "/paths/pentest" });
    expect(db.statsRepository.findPublicPath).not.toHaveBeenCalled();
  });

  it("shows it to a banned account, which the app is closed to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: "u1" });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });

    expect(await html()).toContain("Pentest : les bases");
  });
});

describe("a path that is not there", () => {
  it("is not found for a slug nobody has, a draft or a class's path alike", async () => {
    db.statsRepository.findPublicPath.mockResolvedValue(null);
    await expect(page("inconnu")).rejects.toBeInstanceOf(NotFound);
  });

  it("is not found for something that is not a slug, without asking the database", async () => {
    await expect(page("../etc/passwd")).rejects.toBeInstanceOf(NotFound);
    await expect(page("Pentest")).rejects.toBeInstanceOf(NotFound);
    expect(db.statsRepository.findPublicPath).not.toHaveBeenCalled();
  });

  it("is not found, rather than an error page, when the database does not answer", async () => {
    db.statsRepository.findPublicPath.mockRejectedValue(new Error("db down"));
    await expect(page("pentest")).rejects.toBeInstanceOf(NotFound);
  });
});

describe("its metadata", () => {
  it("is its own canonical and its own preview's address", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "pentest" }) });

    expect(metadata.title).toBe("Pentest : les bases : le parcours");
    expect(metadata.description).toBe("Reconnaître, exploiter, rendre compte.");
    expect(metadata.alternates?.canonical).toBe("/catalogue/pentest");
    expect(metadata.openGraph).toMatchObject({ url: "/catalogue/pentest", siteName: "CyberLearn" });
  });

  it("keeps a path that is not there out of the index", async () => {
    db.statsRepository.findPublicPath.mockResolvedValue(null);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "inconnu" }) });

    expect(metadata.robots).toEqual({ index: false });
  });
});
