import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where the glossary is drawn. A lesson's "Tous les termes →" opens it in the
 * same tab; drawn with the public navbar alone, it took a signed-in learner
 * out of the app and offered them "Connexion". The shell and the navbar are
 * stubbed: whether each is drawn, and for whom, is this file's business.
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

const { default: GlossaryLayout } = await import("../layout");

const READER = "22222222-2222-4222-8222-222222222222";

async function render(): Promise<string> {
  return renderToStaticMarkup(
    await GlossaryLayout({ children: React.createElement("x-page", null, "glossaire") }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getActiveBan.mockResolvedValue(null);
});

describe("the glossary's frame", () => {
  it("is the app's shell for a signed-in learner, without the public navbar", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    const html = await render();

    expect(html).toBe(`<x-shell data-user="${READER}"><x-page>glossaire</x-page></x-shell>`);
  });

  it("is the public page, with its navbar, for a visitor", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).not.toContain("x-shell");
    expect(html).toBe(
      '<div class="glossary-page"><x-public-navbar></x-public-navbar><main id="contenu"><x-page>glossaire</x-page></main></div>',
    );
  });

  it("is the public page for a banned account, which the app is closed to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });
    const html = await render();

    expect(html).not.toContain("x-shell");
    expect(html).toContain("<x-public-navbar>");
  });
});
