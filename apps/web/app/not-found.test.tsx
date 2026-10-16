import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The 404's ways out. A signed-in learner who hit it from a lesson was sent
 * to the public catalogue, whose cards all lead to the sign-up form, and from
 * there to the dashboard instead of the path they clicked.
 */

const auth = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
}));
vi.mock("@/lib/auth", () => auth);

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }),
}));

const { default: NotFoundPage } = await import("./not-found");

async function render(): Promise<string> {
  return renderToStaticMarkup(await NotFoundPage());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the 404 page", () => {
  it("leads a signed-in learner back into the app: the dashboard and the paths", async () => {
    auth.getRequestUser.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" });
    const html = await render();

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/paths"');
    expect(html).toContain("Voir les parcours");
    expect(html).not.toContain('href="/catalogue"');
  });

  it("leads a visitor to the home page and the public catalogue", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).toContain('href="/catalogue"');
    expect(html).toContain("Retour à l’accueil");
    expect(html).not.toContain('href="/dashboard"');
    expect(html).not.toContain('href="/paths"');
  });
});
