// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "@cyberlearn/db";

const m = vi.hoisted(() => ({
  getNotificationsAction: vi.fn(),
  markNotificationReadAction: vi.fn<(id: string) => Promise<{ success: boolean }>>(),
  markAllNotificationsReadAction: vi.fn(),
}));

vi.mock("@/app/(app)/_actions/notification-actions", () => m);
vi.mock("@cyberlearn/db/supabase/client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    createSupabaseBrowserClient: () => ({
      channel: () => channel,
      removeChannel: () => Promise.resolve(),
    }),
  };
});
// Only what an anchor takes: Link's own props (prefetch) stay behind.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    style,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a href={href} className={className} style={style} onClick={onClick}>
      {children}
    </a>
  ),
}));

const { NotificationPanel } = await import("../notification-panel");

/**
 * The bell's rows: a notice that leads somewhere is a link the keyboard
 * reaches, one that only needs reading is a button, and following one marks
 * it read and closes the panel without reloading the site.
 */

function notice(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    type: "REVIEW_REMINDER",
    title: "Révision recommandée",
    body: 'Il est temps de revoir "TCP".',
    actionUrl: "/revisions",
    readAt: null,
    createdAt: new Date(),
    metadata: null,
    ...overrides,
  };
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.markNotificationReadAction.mockResolvedValue({ success: true });
  m.getNotificationsAction.mockResolvedValue({
    success: true,
    unreadCount: 2,
    notifications: [
      notice({}),
      notice({
        id: "22222222-2222-4222-8222-222222222222",
        type: "ANNOUNCEMENT",
        title: "Maintenance ce soir",
        body: "Le site sera indisponible une heure.",
        actionUrl: null,
      }),
      notice({
        id: "33333333-3333-4333-8333-333333333333",
        type: "ANNOUNCEMENT",
        title: "Déjà lue",
        body: "Rien à faire.",
        actionUrl: null,
        readAt: new Date(),
      }),
    ],
  });
});

async function openPanel(): Promise<void> {
  render(<NotificationPanel initialUnreadCount={2} userId="me" />);
  fireEvent.click(screen.getByRole("button", { name: "2 notifications non lues" }));
  await screen.findByText("Révision recommandée");
}

describe("NotificationPanel rows", () => {
  it("draws a notice that leads somewhere as a link to its page", async () => {
    await openPanel();
    const link = screen.getByRole("link", { name: /Révision recommandée/ });
    expect(link.getAttribute("href")).toBe("/revisions");
  });

  it("marks the notice read and closes the panel when it is followed", async () => {
    await openPanel();
    fireEvent.click(screen.getByRole("link", { name: /Révision recommandée/ }));
    expect(m.markNotificationReadAction).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(screen.queryByText("Révision recommandée")).toBeNull();
  });

  it("keeps the panel open on a click meant for a new tab", async () => {
    await openPanel();
    fireEvent.click(screen.getByRole("link", { name: /Révision recommandée/ }), { ctrlKey: true });
    expect(screen.getByText("Révision recommandée")).toBeTruthy();
  });

  it("makes an unread notice with no page a button that marks it read", async () => {
    await openPanel();
    const button = screen.getByRole("button", { name: /Maintenance ce soir/ });
    fireEvent.click(button);
    expect(m.markNotificationReadAction).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("leaves a read notice with nowhere to go as plain text", async () => {
    await openPanel();
    expect(screen.queryByRole("button", { name: /Déjà lue/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Déjà lue/ })).toBeNull();
    expect(screen.getByText("Déjà lue")).toBeTruthy();
  });
});
