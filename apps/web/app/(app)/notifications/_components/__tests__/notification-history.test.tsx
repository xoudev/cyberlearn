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

const friends = vi.hoisted(() => ({
  acceptFriendRequestAction: vi.fn<(id: string) => Promise<{ ok: boolean; error?: string }>>(),
  declineFriendRequestAction: vi.fn<(id: string) => Promise<{ ok: boolean; error?: string }>>(),
}));

vi.mock("@/app/(app)/_actions/notification-actions", () => m);
vi.mock("@/app/(app)/_actions/friend-actions", () => friends);
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
      initialWaiting={[]}
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

describe("NotificationHistory friend requests", () => {
  const SAM = "44444444-4444-4444-8444-444444444444";
  const LOU = "55555555-5555-4555-8555-555555555555";
  const CURSOR = { createdAt: "2026-10-17T09:00:00.000Z", id: B };

  function request(id: string, from: string, title: string): NotificationItem {
    return {
      ...notice(id, title),
      type: "FRIEND_REQUEST",
      actionUrl: "/u/sam",
      metadata: { fromUserId: from },
    };
  }

  beforeEach(() => {
    friends.acceptFriendRequestAction.mockResolvedValue({ ok: true });
  });

  it("answers a waiting request from its row, as the panel does, and marks it read", async () => {
    const panel = vi.fn();
    stops.push(onReadElsewhere("panel", panel));
    render(
      <NotificationHistory
        initialItems={[request(A, SAM, "Demande de Sam")]}
        initialNext={null}
        initialUnread={1}
        initialWaiting={[SAM]}
        unreadOnly={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(friends.acceptFriendRequestAction).toHaveBeenCalledWith(SAM);
    expect((await screen.findByRole("status")).textContent).toBe("Vous êtes amis.");
    await vi.waitFor(() => {
      expect(panel).toHaveBeenCalledWith({ source: "history", ids: [A] });
    });
  });

  it("offers the answer on the next page's rows, read as waiting with them", async () => {
    m.getNotificationPageAction.mockResolvedValue({
      success: true,
      notifications: [request("66666666-6666-4666-8666-666666666666", LOU, "Demande de Lou")],
      next: null,
      waitingSenders: [LOU],
    });
    render(
      <NotificationHistory
        initialItems={[request(A, SAM, "Demande de Sam")]}
        initialNext={CURSOR}
        initialUnread={2}
        initialWaiting={[]}
        unreadOnly={false}
      />,
    );
    // Sam's request no longer waits: its row keeps its link, nothing more.
    expect(screen.queryByRole("group", { name: "Répondre à la demande d'ami" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Charger plus" }));
    await screen.findByText("Demande de Lou");
    expect(screen.getAllByRole("group", { name: "Répondre à la demande d'ami" })).toHaveLength(1);
  });
});
