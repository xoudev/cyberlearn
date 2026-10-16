import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCatalogPath } from "@cyberlearn/db";
import { PublicCatalogue } from "../public-catalogue";

/**
 * The catalogue for whoever reads it. It was the visitors' showcase for
 * everybody: a signed-in learner (sent there by the 404, among others) got
 * the public navbar, and cards that led to the sign-up form, which sent them
 * on to the dashboard instead of the path they clicked.
 */

const auth = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getActiveBan: vi.fn<() => Promise<{ id: string } | null>>(),
}));
vi.mock("@/lib/auth", () => auth);

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ userId, children }: { userId: string; children: React.ReactNode }) =>
    React.createElement("x-shell", { "data-user": userId }, children),
}));
vi.mock("@/app/_components/public-navbar", () => ({
  PublicNavbar: () => React.createElement("x-public-navbar"),
}));

const { default: CatalogueLayout } = await import("../layout");

const READER = "22222222-2222-4222-8222-222222222222";

const PATH: PublicCatalogPath & { coverSrc: string } = {
  slug: "linux-premiers-pas",
  title: "Linux : premiers pas",
  description: "Le terminal, les fichiers, les droits.",
  category: "NETWORK",
  difficulty: "BEGINNER",
  track: "SKILL",
  refCode: "NET-01",
  lessons: 8,
  estimatedHours: 6,
  xp: 1200,
  hasCertificate: true,
  rating: null,
  coverImageUrl: null,
  coverSrc: "/covers/paths/category-dev.svg",
};

async function renderLayout(): Promise<string> {
  return renderToStaticMarkup(
    await CatalogueLayout({ children: React.createElement("x-page", null, "catalogue") }),
  );
}

function renderCatalogue(member: boolean): string {
  return renderToStaticMarkup(<PublicCatalogue paths={[PATH]} member={member} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getActiveBan.mockResolvedValue(null);
});

describe("the catalogue's frame", () => {
  it("is the app's shell for a signed-in learner, without the public navbar", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });

    expect(await renderLayout()).toBe(
      `<x-shell data-user="${READER}"><x-page>catalogue</x-page></x-shell>`,
    );
  });

  it("is the public showcase, with its navbar, for a visitor", async () => {
    auth.getRequestUser.mockResolvedValue(null);

    expect(await renderLayout()).toBe(
      '<div class="public-catalogue"><x-public-navbar></x-public-navbar><main id="contenu"><x-page>catalogue</x-page></main></div>',
    );
  });

  it("is the public showcase for a banned account, which the app is closed to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });

    expect(await renderLayout()).not.toContain("x-shell");
  });
});

describe("the catalogue's cards", () => {
  it("open the path itself for a signed-in learner", () => {
    const html = renderCatalogue(true);

    expect(html).toContain('href="/paths/linux-premiers-pas"');
    expect(html).not.toContain('href="/register"');
    expect(html).not.toContain("avant de créer ton compte");
  });

  it("lead a visitor to the sign-up form", () => {
    const html = renderCatalogue(false);

    expect(html).toContain('href="/register"');
    expect(html).toContain("avant de créer ton compte");
  });
});
