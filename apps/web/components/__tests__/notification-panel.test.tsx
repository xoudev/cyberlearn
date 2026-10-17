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
// Only what an anchor takes: Link's own props (prefetch) stay behind. Marked,
// so a test can tell the router's link from a plain one.
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
    <a href={href} className={className} style={style} onClick={onClick} data-router-link="">
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
    expect(link.hasAttribute("data-router-link")).toBe(true);
  });

  it("keeps a link to a route handler off the router, and still follows it", async () => {
    m.getNotificationsAction.mockResolvedValue({
      success: true,
      unreadCount: 1,
      notifications: [
        notice({
          id: "44444444-4444-4444-8444-444444444444",
          type: "CERTIFICATE_ISSUED",
          title: "Certificat émis",
          body: 'Ton certificat pour "Réseau" est disponible.',
          actionUrl: "/api/certificates/55555555-5555-4555-8555-555555555555/download",
        }),
      ],
    });
    render(<NotificationPanel initialUnreadCount={1} userId="me" />);
    fireEvent.click(screen.getByRole("button", { name: "1 notifications non lues" }));
    const link = await screen.findByRole("link", { name: /Certificat émis/ });

    expect(link.getAttribute("href")).toBe(
      "/api/certificates/55555555-5555-4555-8555-555555555555/download",
    );
    expect(link.hasAttribute("data-router-link")).toBe(false);

    fireEvent.click(link);
    expect(m.markNotificationReadAction).toHaveBeenCalledWith(
      "44444444-4444-4444-8444-444444444444",
    );
    expect(screen.queryByText("Certificat émis")).toBeNull();
  });

  it("leads a revoked certificate's notice to the certificates page, with a mark of its own", async () => {
    m.getNotificationsAction.mockResolvedValue({
      success: true,
      unreadCount: 1,
      notifications: [
        notice({
          id: "66666666-6666-4666-8666-666666666666",
          type: "CERTIFICATE_REVOKED",
          title: "Certificat révoqué : Réseau",
          body: "Ton certificat du parcours « Réseau » n'est plus valide. Motif : fraude.",
          actionUrl: "/certificates",
        }),
      ],
    });
    render(<NotificationPanel initialUnreadCount={1} userId="me" />);
    fireEvent.click(screen.getByRole("button", { name: "1 notifications non lues" }));
    const link = await screen.findByRole("link", { name: /Certificat révoqué : Réseau/ });

    expect(link.getAttribute("href")).toBe("/certificates");
    expect(link.hasAttribute("data-router-link")).toBe(true);
    expect(link.textContent).toContain("🚫");
    expect(link.textContent).not.toContain("📜");
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

  it("dates a notice in the unit its age calls for, not in minutes", async () => {
    m.getNotificationsAction.mockResolvedValue({
      success: true,
      unreadCount: 1,
      notifications: [
        notice({ createdAt: new Date(Date.now() - 7 * 24 * 3_600_000) }),
        notice({
          id: "22222222-2222-4222-8222-222222222222",
          title: "Hier",
          createdAt: new Date(Date.now() - 26 * 3_600_000),
        }),
      ],
    });
    await openPanel();
    expect(screen.getByText("il y a 1 sem.")).toBeTruthy();
    expect(screen.getByText("hier")).toBeTruthy();
    expect(screen.queryByText(/minutes/)).toBeNull();
  });

  it("leaves a read notice with nowhere to go as plain text", async () => {
    await openPanel();
    expect(screen.queryByRole("button", { name: /Déjà lue/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Déjà lue/ })).toBeNull();
    expect(screen.getByText("Déjà lue")).toBeTruthy();
  });
});

describe("NotificationPanel failures", () => {
  it("says a failed load in the panel, instead of throwing to the site's error screen", async () => {
    m.getNotificationsAction.mockRejectedValueOnce(new Error("db down"));
    render(<NotificationPanel initialUnreadCount={2} userId="me" />);
    fireEvent.click(screen.getByRole("button", { name: "2 notifications non lues" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Chargement impossible/);
    // Not "nothing to read": nothing could be read.
    expect(screen.queryByText("Aucune notification")).toBeNull();
  });

  it("keeps the notices unread when marking them all fails, and says so", async () => {
    m.markAllNotificationsReadAction.mockRejectedValueOnce(new Error("network"));
    await openPanel();
    // Disabled while the panel's load is still settling: a click then is lost.
    const markAll = screen.getByRole<HTMLButtonElement>("button", { name: "Tout lire" });
    await vi.waitFor(() => {
      expect(markAll.disabled).toBe(false);
    });
    fireEvent.click(markAll);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Impossible de tout marquer/);
    expect(screen.getByRole("button", { name: "2 notifications non lues" })).toBeTruthy();
  });

  it("leaves a notice unread when marking it fails, without an error screen", async () => {
    m.markNotificationReadAction.mockRejectedValueOnce(new Error("network"));
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: /Maintenance ce soir/ }));
    await vi.waitFor(() => {
      expect(m.markNotificationReadAction).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: /Maintenance ce soir/ })).toBeTruthy();
  });
});
