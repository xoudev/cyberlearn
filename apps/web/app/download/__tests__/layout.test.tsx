import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The download page's frame. Signed in, the footer's "Application mobile" leads
 * here and the page is a page of the app; signed out it stays the visitors'
 * page, which draws its own navbar. A banned account reads it as a visitor
 * does, since the app the shell leads into is closed to it (the catalogue's
 * and the public profile's rule).
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

const { default: DownloadLayout } = await import("../layout");

const READER = "22222222-2222-4222-8222-222222222222";

async function renderLayout(): Promise<string> {
  return renderToStaticMarkup(
    await DownloadLayout({ children: React.createElement("x-page", null, "download") }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getActiveBan.mockResolvedValue(null);
});

describe("the download page's frame", () => {
  it("is the app's shell for a signed-in learner", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });

    expect(await renderLayout()).toBe(
      `<x-shell data-user="${READER}"><x-page>download</x-page></x-shell>`,
    );
  });

  it("is the page alone for a visitor, which draws its own navbar", async () => {
    auth.getRequestUser.mockResolvedValue(null);

    expect(await renderLayout()).toBe("<x-page>download</x-page>");
    expect(auth.getActiveBan).not.toHaveBeenCalled();
  });

  it("is the page alone for a banned account, which the app is closed to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });

    expect(await renderLayout()).toBe("<x-page>download</x-page>");
  });
});
