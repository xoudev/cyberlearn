// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "@cyberlearn/db";

const m = vi.hoisted(() => ({
  getNotificationsAction: vi.fn(),
  getNotificationPageAction: vi.fn(),
  markNotificationReadAction: vi.fn<(id: string) => Promise<{ success: boolean }>>(),
  markAllNotificationsReadAction: vi.fn<() => Promise<{ success: boolean }>>(),
}));

vi.mock("@/app/(app)/_actions/notification-actions", () => m);
vi.mock("@cyberlearn/db/supabase/client", () => ({ createSupabaseBrowserClient: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { NotificationHistory } = await import("../notification-history");
const { announceRead, onReadElsewhere } = await import("@/lib/notifications/read-sync");

/**
 * The history page and the bell's panel keep their own lists: what the page
 * marks read, the panel is told, and what the panel marks read, the page
 * follows.
 */

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function notice(id: string, title: string): NotificationItem {
  return {
    id,
    type: "ANNOUNCEMENT",
    title,
    body: "Corps",
    actionUrl: null,
    readAt: null,
    createdAt: new Date(),
    metadata: null,
  };
}

function renderHistory(): void {
  render(
    <NotificationHistory
      initialItems={[notice(A, "Première"), notice(B, "Seconde")]}
      initialNext={null}
      initialUnread={2}
      unreadOnly={false}
    />,
  );
}

const stops: (() => void)[] = [];
afterEach(() => {
  cleanup();
  for (const stop of stops.splice(0)) stop();
});

beforeEach(() => {
  vi.clearAllMocks();
  m.markNotificationReadAction.mockResolvedValue({ success: true });
  m.markAllNotificationsReadAction.mockResolvedValue({ success: true });
});

describe("NotificationHistory and the bell", () => {
  it("tells the bell when everything was marked read here", async () => {
    const panel = vi.fn();
    stops.push(onReadElsewhere("panel", panel));
    renderHistory();
    fireEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    await vi.waitFor(() => {
      expect(panel).toHaveBeenCalledWith({ source: "history", all: true });
    });
  });

  it("tells the bell which row was read here", async () => {
    const panel = vi.fn();
    stops.push(onReadElsewhere("panel", panel));
    renderHistory();
    fireEvent.click(screen.getByRole("button", { name: /Première/ }));
    await vi.waitFor(() => {
      expect(panel).toHaveBeenCalledWith({ source: "history", ids: [A] });
    });
  });

  it("follows what the bell marked read", () => {
    renderHistory();
    act(() => {
      announceRead({ source: "panel", ids: [B] });
    });
    // Read, with nowhere to go: no longer a button, and one unread left.
    expect(screen.queryByRole("button", { name: /Seconde/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Non lues/ }).textContent).toContain("1");
    act(() => {
      announceRead({ source: "panel", all: true });
    });
    expect(screen.queryByRole("button", { name: "Tout marquer comme lu" })).toBeNull();
  });
});
