import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  challengeCatalogueFor:
    vi.fn<(userId: string, now: Date) => Promise<{ items: unknown[]; weekly: unknown }>>(),
  tournamentListFor:
    vi.fn<(userId: string) => Promise<{ tournaments: unknown[]; inClass: boolean }>>(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@/lib/challenges/catalogue", () => ({ challengeCatalogueFor: m.challengeCatalogueFor }));
vi.mock("@/lib/tournaments/tournaments", () => ({ tournamentListFor: m.tournamentListFor }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../_components/challenges-client", () => ({
  ChallengesClient: () => <p>catalogue des défis</p>,
}));

const { default: ChallengesPage, generateMetadata } = await import("../page");

/**
 * The challenges section and its two tabs: the catalogue, and the
 * tournaments that had their own page. The Tournois tab is there for
 * everyone, reads the tournaments only when it is the one open, and tells a
 * reader in no class why the list is empty.
 */

function params(query: Record<string, string | string[]>): {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
} {
  return { searchParams: Promise.resolve(query) };
}

async function render(query: Record<string, string | string[]>): Promise<string> {
  return renderToStaticMarkup(await ChallengesPage(params(query)));
}

/** The tab link marked as the page being read. */
function currentTab(html: string): string | null {
  return /<a[^>]*aria-current="page"[^>]*>([^<]+)<\/a>/u.exec(html)?.[1] ?? null;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: "u1" });
  m.challengeCatalogueFor.mockResolvedValue({ items: [{ id: "c1" }], weekly: null });
  m.tournamentListFor.mockResolvedValue({ tournaments: [], inClass: true });
});

describe("the challenges page", () => {
  it("opens on the catalogue, with both tabs, and reads no tournament", async () => {
    const html = await render({});

    expect(currentTab(html)).toBe("Défis");
    expect(html).toContain('href="/challenges?tab=tournois"');
    expect(html).toContain("catalogue des défis");
    expect(m.challengeCatalogueFor).toHaveBeenCalledWith("u1", expect.any(Date));
    expect(m.tournamentListFor).not.toHaveBeenCalled();
  });

  it("keeps the tournaments tab while the catalogue is being rebuilt", async () => {
    m.challengeCatalogueFor.mockResolvedValue({ items: [], weekly: null });
    const html = await render({});

    expect(html).toContain("Les défis se préparent");
    expect(html).toContain('href="/challenges?tab=tournois"');
  });

  it("opens the tournaments tab, under the section's title, without the catalogue", async () => {
    const html = await render({ tab: "tournois" });

    expect(currentTab(html)).toBe("Tournois");
    expect(html).toMatch(/<h1>Les défis<span/iu);
    expect(html).toContain("Un flag, des points");
    expect(m.tournamentListFor).toHaveBeenCalledWith("u1");
    expect(m.challengeCatalogueFor).not.toHaveBeenCalled();
  });

  it("tells a reader in no class that a tournament brings classes together", async () => {
    m.tournamentListFor.mockResolvedValue({ tournaments: [], inClass: false });
    const html = await render({ tab: "tournois" });

    expect(html).toContain("Les tournois se jouent en classe");
    expect(html).toContain("Tu n&#x27;es dans aucune classe pour l&#x27;instant");
  });

  it("opens the catalogue for a tab it does not have", async () => {
    const html = await render({ tab: "classement" });

    expect(currentTab(html)).toBe("Défis");
    expect(m.tournamentListFor).not.toHaveBeenCalled();
  });

  it("names the tab in the document's title", async () => {
    expect(await generateMetadata(params({ tab: "tournois" }))).toEqual({ title: "Tournois" });
    expect(await generateMetadata(params({}))).toEqual({ title: "Défis" });
  });
});
