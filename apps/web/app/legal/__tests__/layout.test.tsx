import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where the legal texts are drawn. The app's footer leads to them ("CGU",
 * "Confidentialité", "Mentions légales"); drawn with the public navbar for
 * everybody, they took a signed-in learner out of the app and offered them
 * "Connexion". The shell and the navbar are stubbed: whether each is drawn,
 * and for whom, is this file's business. Who counts as signed in for this
 * (a session that owes its second-factor code does not) is
 * lib/auth/app-shell-reader.ts's, tested on its own.
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

const { default: LegalLayout } = await import("../layout");
const { default: PrivacyLayout } = await import("../../privacy/layout");

const READER = "22222222-2222-4222-8222-222222222222";

const LAYOUTS = [
  { name: "the legal notice and the terms", Layout: LegalLayout },
  { name: "the privacy policy", Layout: PrivacyLayout },
];

async function render(
  Layout: (props: { children: React.ReactNode }) => Promise<React.JSX.Element>,
): Promise<string> {
  return renderToStaticMarkup(
    await Layout({ children: React.createElement("x-page", null, "texte") }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LAYOUTS)("the frame of $name", ({ Layout }) => {
  it("is the app's shell for a signed-in learner, without the public navbar", async () => {
    reader.appShellReaderId.mockResolvedValue(READER);
    const html = await render(Layout);

    expect(html.startsWith(`<x-shell data-user="${READER}">`)).toBe(true);
    expect(html).toContain("<x-page>texte</x-page>");
    expect(html).not.toContain("x-public-navbar");
    // The shell draws the page's <main> and the app's footer itself.
    expect(html).not.toContain("<main");
    expect(html).not.toContain("<footer");
    // The way back leads into the app, not to the landing it would bounce off.
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain("Retour à l’accueil");
  });

  it("is the public page, with its navbar and its footer, for a visitor", async () => {
    reader.appShellReaderId.mockResolvedValue(null);
    const html = await render(Layout);

    expect(html).not.toContain("x-shell");
    expect(html).toContain("<x-public-navbar></x-public-navbar>");
    expect(html).toContain('<main id="contenu" class="legal-layout">');
    expect(html).toContain("<x-page>texte</x-page>");
    // The visitors' footer: its "Contact" is the public form.
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Retour à l’accueil");
  });

  it("keeps the list of the legal texts in either frame", async () => {
    for (const id of [READER, null]) {
      reader.appShellReaderId.mockResolvedValue(id);
      const html = await render(Layout);

      for (const href of ["/legal", "/legal/terms", "/privacy"]) {
        expect(html).toContain(`href="${href}"`);
      }
    }
  });
});
