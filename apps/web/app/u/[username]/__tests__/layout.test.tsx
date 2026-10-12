import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where a profile is drawn: in the app's shell for a signed-in reader, alone
 * for anybody else. The shell is stubbed: what it draws is app-shell's
 * business (and the (app) layout's); whether it is drawn, and for whom, is
 * this file's.
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

const { default: PublicProfileLayout } = await import("../layout");

const READER = "22222222-2222-4222-8222-222222222222";

async function render(): Promise<string> {
  return renderToStaticMarkup(
    await PublicProfileLayout({ children: React.createElement("x-page", null, "profil") }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getActiveBan.mockResolvedValue(null);
});

describe("the public profile's frame", () => {
  it("draws the page in the app's shell for a signed-in reader", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    const html = await render();

    expect(html).toContain(`<x-shell data-user="${READER}"><x-page>profil</x-page></x-shell>`);
    expect(html).not.toContain("pp-standalone");
  });

  it("draws it alone, with the way to the site, for a reader signed out", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).not.toContain("x-shell");
    expect(html).toContain('class="pp-standalone"');
    expect(html).toContain('<main id="contenu"><x-page>profil</x-page></main>');
    expect(html).toContain('href="/"');
  });

  it("draws it alone for a banned account, which the app is closed to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });
    const html = await render();

    expect(html).not.toContain("x-shell");
    expect(html).toContain('class="pp-standalone"');
  });
});
