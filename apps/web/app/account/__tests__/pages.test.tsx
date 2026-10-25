import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const keep = vi.hoisted(() => vi.fn());
vi.mock("../keep/actions", () => ({ keepAccountAction: keep }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
const { default: ConfirmPage, dynamic } = await import("../delete/confirm/page");
const { default: ErrorPage } = await import("../delete/error/page");
const { default: KeepPage } = await import("../keep/page");
const { default: KeepDonePage } = await import("../keep/done/page");

describe("account state pages", () => {
  it("keeps deletion confirmation dynamic and submits its token only through POST", async () => {
    expect(dynamic).toBe("force-dynamic");
    const html = renderToStaticMarkup(
      await ConfirmPage({ searchParams: Promise.resolve({ token: "design-test-token" }) }),
    );
    expect(html).toContain('method="POST"');
    expect(html).toContain('action="/api/me/delete/confirm"');
    expect(html).toContain('type="hidden" name="token" value="design-test-token"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Cette action est irréversible.");
  });
  it.each([undefined, "", ["one", "two"], "bad/token", "x".repeat(201)])(
    "refuses an invalid confirmation token: %j",
    async (token) => {
      await expect(ConfirmPage({ searchParams: Promise.resolve({ token }) })).rejects.toThrow(
        "REDIRECT /account/delete/error?reason=invalid",
      );
    },
  );
  it.each(["toString", "constructor", ["expired", "used"], undefined])(
    "uses the generic deletion message for an unknown reason: %j",
    async (reason) => {
      const html = renderToStaticMarkup(
        await ErrorPage({ searchParams: Promise.resolve({ reason }) }),
      );
      expect(html).toContain("Une erreur est survenue. Réessaie, ou écris au support.");
      expect(html).toContain('href="mailto:privacy@cyberlearn.fr"');
    },
  );
  it("keeps the separate authentication-cleanup failure message", async () => {
    const html = renderToStaticMarkup(
      await ErrorPage({ searchParams: Promise.resolve({ reason: "auth_cleanup_failed" }) }),
    );
    expect(html).toContain("Tes données ont été supprimées de notre base");
    expect(html).toContain("côté authentification");
  });
  it("only presents an incomplete keep link and never calls its action", async () => {
    const html = renderToStaticMarkup(await KeepPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Ce lien n&#x27;est pas complet");
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("<form");
    expect(keep).not.toHaveBeenCalled();
  });
  it("presents a valid-shaped keep token in its existing form without consuming it", async () => {
    const token = "a".repeat(43);
    const html = renderToStaticMarkup(await KeepPage({ searchParams: Promise.resolve({ token }) }));
    expect(html).toContain('name="token"');
    expect(html).toContain(token);
    expect(html).toContain("Garder mon compte");
    expect(keep).not.toHaveBeenCalled();
  });
  it("distinguishes a kept account from a link that no longer serves", async () => {
    const kept = renderToStaticMarkup(
      await KeepDonePage({ searchParams: Promise.resolve({ kept: "1" }) }),
    );
    const spent = renderToStaticMarkup(
      await KeepDonePage({ searchParams: Promise.resolve({ kept: "0" }) }),
    );
    expect(kept).toContain("Ton compte est gardé");
    expect(spent).toContain("Ce lien ne sert plus");
  });
});
