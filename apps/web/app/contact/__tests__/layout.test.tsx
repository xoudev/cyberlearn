import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where the contact form is drawn. With the public navbar for everybody, it
 * offered "Connexion" to somebody signed in and took them out of the app.
 * The shell and the navbar are stubbed: whether each is drawn, and for whom,
 * is this file's business. A session that still owes its second-factor code
 * gets the visitors' frame (lib/auth/app-shell-reader.ts, tested on its own):
 * the form is its way to the team when the phone is lost.
 */

const reader = vi.hoisted(() => ({
  appShellReaderId: vi.fn<() => Promise<string | null>>(),
}));
vi.mock("@/lib/auth/app-shell-reader", () => reader);

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ userId, children }: { userId: string; children: React.ReactNode }) =>
    React.createElement("x-shell", { "data-user": userId }, children),
}));
vi.mock("@/app/_components/public-navbar", () => ({
  PublicNavbar: () => React.createElement("x-public-navbar"),
}));

const { default: ContactLayout, metadata } = await import("../layout");

const READER = "22222222-2222-4222-8222-222222222222";

async function render(): Promise<string> {
  return renderToStaticMarkup(
    await ContactLayout({ children: React.createElement("x-form", null, "formulaire") }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the contact form's frame", () => {
  it("is the app's shell for a signed-in learner, without the public navbar", async () => {
    reader.appShellReaderId.mockResolvedValue(READER);
    const html = await render();

    expect(html.startsWith(`<x-shell data-user="${READER}">`)).toBe(true);
    expect(html).toContain("<x-form>formulaire</x-form>");
    expect(html).not.toContain("x-public-navbar");
    // The shell draws the page's <main> itself.
    expect(html).not.toContain("<main");
    expect(html).toContain('href="/dashboard"');
  });

  it("is the public page, with its navbar, for a visitor", async () => {
    reader.appShellReaderId.mockResolvedValue(null);
    const html = await render();

    expect(html).not.toContain("x-shell");
    expect(html).toContain("<x-public-navbar></x-public-navbar>");
    expect(html).toContain('<main id="contenu" class="contact-layout">');
    expect(html).toContain("<x-form>formulaire</x-form>");
    expect(html).toContain("Retour à l’accueil");
  });

  it("keeps the same heading in either frame", async () => {
    for (const id of [READER, null]) {
      reader.appShellReaderId.mockResolvedValue(id);
      const html = await render();

      expect(html).toContain("On t’écoute");
      expect(html).toContain('aria-label="Formulaire de contact"');
    }
  });

  it("keeps its own address and preview", () => {
    expect(metadata.alternates?.canonical).toBe("/contact");
  });
});
