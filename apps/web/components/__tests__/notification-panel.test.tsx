// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "@cyberlearn/db";

const m = vi.hoisted(() => ({
  getNotificationsAction: vi.fn(),
  markNotificationReadAction: vi.fn<(id: string) => Promise<{ success: boolean }>>(),
  markAllNotificationsReadAction: vi.fn(),
}));
const friends = vi.hoisted(() => ({
  acceptFriendRequestAction: vi.fn<(id: string) => Promise<{ ok: boolean; error?: string }>>(),
  declineFriendRequestAction: vi.fn<(id: string) => Promise<{ ok: boolean; error?: string }>>(),
}));

vi.mock("@/app/(app)/_actions/notification-actions", () => m);
vi.mock("@/app/(app)/_actions/friend-actions", () => friends);
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
const { announceRead, onReadElsewhere } = await import("@/lib/notifications/read-sync");

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

describe("NotificationPanel and the history page", () => {
  it("takes off the badge what the history page marked read", () => {
    render(<NotificationPanel initialUnreadCount={3} userId="me" />);
    act(() => {
      announceRead({ source: "history", ids: ["11111111-1111-4111-8111-111111111111"] });
    });
    expect(screen.getByRole("button", { name: "2 notifications non lues" })).toBeTruthy();
    act(() => {
      announceRead({ source: "history", all: true });
    });
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
  });

  it("reads in its open list the rows the history page marked read", async () => {
    await openPanel();
    act(() => {
      announceRead({ source: "history", ids: ["22222222-2222-4222-8222-222222222222"] });
    });
    // Read, with nowhere to go: no longer a button that marks it read.
    expect(screen.queryByRole("button", { name: /Maintenance ce soir/ })).toBeNull();
    expect(screen.getByRole("button", { name: "1 notifications non lues" })).toBeTruthy();
  });

  it("tells the history page what it marked read", async () => {
    const history = vi.fn();
    const stop = onReadElsewhere("history", history);
    try {
      await openPanel();
      fireEvent.click(screen.getByRole("button", { name: /Maintenance ce soir/ }));
      await vi.waitFor(() => {
        expect(history).toHaveBeenCalledWith({
          source: "panel",
          ids: ["22222222-2222-4222-8222-222222222222"],
        });
      });
    } finally {
      stop();
    }
  });
});

describe("NotificationPanel friend requests", () => {
  const SAM = "44444444-4444-4444-8444-444444444444";
  const REQUEST_ID = "55555555-5555-4555-8555-555555555555";

  function withRequest(waitingSenders: string[], metadata: unknown = { fromUserId: SAM }): void {
    m.getNotificationsAction.mockResolvedValue({
      success: true,
      unreadCount: 1,
      waitingSenders,
      notifications: [
        notice({
          id: REQUEST_ID,
          type: "FRIEND_REQUEST",
          title: "Demande d'ami",
          body: "Sam souhaite t'ajouter.",
          actionUrl: "/u/sam",
          metadata: metadata as NotificationItem["metadata"],
        }),
      ],
    });
  }

  async function openWith(): Promise<void> {
    render(<NotificationPanel initialUnreadCount={1} userId="me" />);
    fireEvent.click(screen.getByRole("button", { name: "1 notifications non lues" }));
    await screen.findByText("Demande d'ami");
  }

  beforeEach(() => {
    friends.acceptFriendRequestAction.mockResolvedValue({ ok: true });
    friends.declineFriendRequestAction.mockResolvedValue({ ok: true });
  });

  it("answers a request from its notice, beside the link rather than inside it", async () => {
    withRequest([SAM]);
    await openWith();
    const group = screen.getByRole("group", { name: "Répondre à la demande d'ami" });
    expect(group.closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: /Demande d'ami/ }).getAttribute("href")).toBe("/u/sam");

    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(friends.acceptFriendRequestAction).toHaveBeenCalledWith(SAM);
    expect((await screen.findByRole("status")).textContent).toBe("Vous êtes amis.");
    expect(m.markNotificationReadAction).toHaveBeenCalledWith(REQUEST_ID);
    expect(screen.queryByRole("button", { name: "Refuser" })).toBeNull();
  });

  it("refuses only the request: the decline that leaves a friendship alone", async () => {
    withRequest([SAM]);
    await openWith();
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(friends.declineFriendRequestAction).toHaveBeenCalledWith(SAM);
    expect((await screen.findByRole("status")).textContent).toBe("Demande refusée.");
  });

  it("says a request answered elsewhere is no longer waiting, and drops the buttons", async () => {
    friends.acceptFriendRequestAction.mockResolvedValue({
      ok: false,
      error: "Cette demande n'est plus en attente.",
    });
    withRequest([SAM]);
    await openWith();
    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect((await screen.findByRole("status")).textContent).toBe(
      "Cette demande n'est plus en attente.",
    );
    expect(screen.queryByRole("button", { name: "Accepter" })).toBeNull();
  });

  it("offers no answer once the request no longer waits, nor on an older notice", async () => {
    withRequest([]);
    await openWith();
    expect(screen.queryByRole("group", { name: "Répondre à la demande d'ami" })).toBeNull();
    cleanup();

    // From before the sender was written down: it keeps its link, nothing more.
    withRequest([SAM], null);
    await openWith();
    expect(screen.queryByRole("group", { name: "Répondre à la demande d'ami" })).toBeNull();
    expect(screen.getByRole("link", { name: /Demande d'ami/ })).toBeTruthy();
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
