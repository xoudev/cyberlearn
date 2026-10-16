import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getActiveBan: vi.fn(),
}));
vi.mock("@/lib/auth", () => auth);

// Where the page sends people is the redirect's business; that it does is this file's.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("../_components/ban-notice", () => ({
  BanNotice: () => React.createElement("x-notice"),
}));
vi.mock("@/app/(app)/_settings/data/_components/ExportDataButton", () => ({
  ExportDataButton: () => <button type="button">Télécharger l&apos;export</button>,
}));

const { default: BannedPage } = await import("../page");

/**
 * /banned is the one page a banned account can open, so it is also the only
 * door left to the account's data: the settings that carry the export and the
 * deletion are behind the ban gate.
 */

beforeEach(() => {
  vi.clearAllMocks();
  auth.getRequestUser.mockResolvedValue({ id: "user-1" });
  auth.getActiveBan.mockResolvedValue({
    reason: "Spam répété sur le forum.",
    expiresAt: null,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    acknowledgedAt: null,
    appealTicketId: null,
  });
});

describe("the banned page", () => {
  it("offers the data export, and says where to ask for the account's deletion", async () => {
    const html = renderToStaticMarkup(await BannedPage());

    expect(html).toContain("Tes données");
    expect(html).toContain("Télécharger l&#x27;export");
    expect(html).toContain('href="mailto:privacy@cyberlearn.fr"');
  });

  it("sends somebody whose ban is over back to the dashboard", async () => {
    auth.getActiveBan.mockResolvedValue(null);
    await expect(BannedPage()).rejects.toThrow("redirect:/dashboard");
  });
});
