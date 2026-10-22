import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getActiveBan: vi.fn(),
}));
vi.mock("@/lib/auth", () => auth);

const m = vi.hoisted(() => ({
  appealStanding: vi.fn<(input: unknown) => Promise<unknown>>(),
  notice: vi.fn<(props: unknown) => void>(),
}));
vi.mock("@/lib/moderation/ban-appeal", () => ({ appealStanding: m.appealStanding }));

// Where the page sends people is the redirect's business; that it does is this file's.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("../_components/ban-notice", () => ({
  BanNotice: (props: unknown) => {
    m.notice(props);
    return React.createElement("x-notice");
  },
}));
vi.mock("@/app/(app)/_settings/data/_components/ExportDataButton", () => ({
  ExportDataButton: () => <button type="button">Télécharger l&apos;export</button>,
}));

const { default: BannedPage } = await import("../page");

/**
 * /banned is the one page a banned account can open, so it is also the only
 * door left to the account's data: the settings that carry the export and the
 * deletion are behind the ban gate. It is also where the team's answer to an
 * appeal is read, the appeal's own ticket being behind the same gate.
 */

const APPEAL = {
  stage: "DECIDED",
  title: "Appel examiné",
  text: "L'équipe de modération a examiné ton appel : le bannissement est maintenu.",
  reply: { body: "Le bannissement est maintenu.", createdAt: "2026-10-20T09:30:00.000Z" },
};

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
  m.appealStanding.mockResolvedValue(null);
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

  it("reads where the appeal stands and hands it to the notice, for the account asking", async () => {
    auth.getActiveBan.mockResolvedValue({
      reason: "Spam répété sur le forum.",
      expiresAt: null,
      createdAt: new Date("2026-10-01T10:00:00Z"),
      acknowledgedAt: new Date("2026-10-01T10:05:00Z"),
      appealTicketId: "ticket-1",
    });
    m.appealStanding.mockResolvedValue(APPEAL);

    renderToStaticMarkup(await BannedPage());

    expect(m.appealStanding).toHaveBeenCalledWith({ userId: "user-1", appealTicketId: "ticket-1" });
    expect(m.notice).toHaveBeenCalledWith(
      expect.objectContaining({ alreadyAppealed: true, appeal: APPEAL }),
    );
  });

  it("hands the notice no appeal when none was filed", async () => {
    renderToStaticMarkup(await BannedPage());

    expect(m.appealStanding).toHaveBeenCalledWith({ userId: "user-1", appealTicketId: null });
    expect(m.notice).toHaveBeenCalledWith(
      expect.objectContaining({ alreadyAppealed: false, appeal: null }),
    );
  });
});
