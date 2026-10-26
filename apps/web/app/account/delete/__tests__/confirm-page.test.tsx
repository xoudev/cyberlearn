import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: ConfirmPage } = await import("../confirm/page");

/**
 * The last page before an irreversible deletion has to say what the deletion
 * does the way the settings window before it and the success page after it do:
 * a certificate is not erased, it is made anonymous (deleteAccount) and stays
 * verifiable at its address.
 */

describe("the deletion's confirmation page", () => {
  it("says the certificates stay verifiable without the holder's name, as the rest of the flow does", async () => {
    const html = renderToStaticMarkup(
      await ConfirmPage({ searchParams: Promise.resolve({ token: "abc123_-XYZ" }) }),
    );

    expect(html).toContain("Ton profil, ta progression, tes badges et tes notes seront effacés.");
    expect(html).toContain(
      "Tes certificats restent vérifiables publiquement, mais ne portent plus ton nom.",
    );
    expect(html).toContain("Cette action est irréversible.");
  });

  it("no longer announces that the certificates will be erased", async () => {
    const html = renderToStaticMarkup(
      await ConfirmPage({ searchParams: Promise.resolve({ token: "abc123_-XYZ" }) }),
    );
    expect(html).not.toMatch(/certificats seront effacés/u);
    expect(html).not.toMatch(/notes et tes certificats/u);
  });

  it("sends a link with no usable token to the error page, before saying anything", async () => {
    await expect(ConfirmPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "redirect:/account/delete/error?reason=invalid",
    );
  });
});
