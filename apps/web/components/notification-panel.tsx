"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import type { NotificationItem, NotificationType } from "@cyberlearn/db";
import { BadgeMedallion, toBadgeRarity, type BadgeRarity } from "@cyberlearn/ui";
import { notificationAge } from "@cyberlearn/lib/social/notification-age";
import {
  friendRequestSender,
  REQUEST_ANSWERED_LABEL,
  REQUEST_GONE_LABEL,
} from "@cyberlearn/lib/social/friendship";
import { FriendsGlyph } from "@/components/friend-mark";
import { PanelButton, useClickOutside } from "@/components/panel-trigger";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(app)/_actions/notification-actions";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
  type FriendActionResult,
} from "@/app/(app)/_actions/friend-actions";

// Keyed on the enum rather than on string: a new NotificationType now fails to
// compile until it has an icon, instead of reaching the panel with a blank
// where the glyph goes.
const TYPE_ICON: Record<NotificationType, string> = {
  LEVEL_UP: "⬆",
  BADGE_EARNED: "🏅",
  PATH_COMPLETED: "✓",
  CERTIFICATE_ISSUED: "📜",
  REVIEW_REMINDER: "⏰",
  ANNOUNCEMENT: "📣",
  TICKET_UPDATE: "🎫",
  CLASS_ENROLLED: "🎓",
  LESSON_ASSIGNED: "📌",
  PATH_ASSIGNED: "⌁",
  NOTE_SHARED: "📝",
  MODERATION_ALERT: "🛡",
  FORUM_REPLY: "💬",
  // Drawn rather than typed - see FriendGlyph below.
  FRIEND_REQUEST: "",
  FRIEND_ACCEPTED: "",
  DUEL_INVITE: "⚔",
  DUEL_RESULT: "🏁",
  TOURNAMENT_ANNOUNCED: "🏆",
  CERTIFICATE_REVOKED: "🚫",
};

/** The two types that get a drawn mark instead of a character. */
const FRIEND_TYPES = new Set<NotificationType>(["FRIEND_REQUEST", "FRIEND_ACCEPTED"]);

/**
 * The friends mark (components/friend-mark.tsx).
 *
 * An emoji would have done, and the rest of this list uses them - but the two
 * friend types are the ones that arrive in a burst (a request, then the answer,
 * then the next person), and a drawn mark in the accent colour is what lets
 * somebody scanning the panel see at a glance which lines are about people.
 *
 * Accepted gets a filled second head, pending an outlined one: the same mark
 * saying which of the two it is, without a second glyph to learn.
 */
function FriendGlyph({ accepted }: { accepted: boolean }): React.JSX.Element {
  return <FriendsGlyph color="var(--cosmetic-accent)" strokeWidth={1.4} filled={accepted} />;
}

// BADGE_EARNED notifications carry the badge rarity in their metadata JSON.
function badgeRarityFromMeta(item: NotificationItem): BadgeRarity {
  // SAFETY: notification metadata is untyped JSON; narrow before reading rarity.
  const meta = (item as { metadata?: unknown }).metadata;
  if (meta !== null && typeof meta === "object" && "rarity" in meta) {
    const r = meta.rarity;
    if (typeof r === "string") return toBadgeRarity(r);
  }
  return "COMMON";
}

const LOAD_FAILED = "Chargement impossible pour l'instant. Referme et rouvre pour réessayer.";
const MARK_ALL_FAILED =
  "Impossible de tout marquer comme lu pour l'instant. Réessaie dans un moment.";

interface NotificationPanelProps {
  initialUnreadCount: number;
  userId: string;
}

export function NotificationPanel({
  initialUnreadCount,
  userId,
}: NotificationPanelProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationItem[]>([]);
  // The senders whose request still waits on the reader: the friend requests
  // whose notification can still be answered in place. Read with the list
  // (getNotificationsAction checks each one against the table).
  const [waiting, setWaiting] = useState<ReadonlySet<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  // What went wrong, said in the panel. An error thrown inside a transition
  // goes to the nearest error boundary, which for the navbar is the site's
  // own: a passing failure used to replace the whole page with it.
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useClickOutside(open, panelRef, buttonRef, setOpen);

  // A row is a link now, so following it is the router's job: a click moves
  // to the page without reloading the site, and one that points at the
  // settings (a moderation decision points at the record) is caught by the
  // drawer like every other link to them. All that is left here is to get
  // the panel out of the way.
  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open || loaded) return;
    startTransition(async () => {
      setFailure(null);
      try {
        const res = await getNotificationsAction();
        if (res.success && res.notifications) {
          setItems(res.notifications);
          setWaiting(new Set(res.waitingSenders ?? []));
          setUnread(res.unreadCount ?? 0);
          setLoaded(true);
          return;
        }
      } catch {
        // Said below, like a refusal. Reopening the panel tries again.
      }
      setFailure(LOAD_FAILED);
    });
  }, [open, loaded]);

  // Supabase Realtime - increment badge on new notifications
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          setUnread((c) => c + 1);
          // If panel is open, prepend the new item
          if (open) {
            const incoming = payload.new as NotificationItem;
            setItems((prev) => [incoming, ...prev]);
            // A request that has just arrived is waiting by definition.
            const sender = friendRequestSender(incoming);
            if (sender !== null) setWaiting((prev) => new Set([...prev, sender]));
          } else {
            // Force reload next time panel opens
            setLoaded(false);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, open]);

  const handleMarkRead = useCallback((id: string) => {
    startTransition(async () => {
      try {
        const res = await markNotificationReadAction(id);
        if (!res.success) return;
      } catch {
        // The notice stays unread, which is the truth; the next opening reads
        // it again. Following its link still works.
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
      setUnread((c) => Math.max(0, c - 1));
    });
  }, []);

  const handleMarkAllRead = useCallback(() => {
    startTransition(async () => {
      setFailure(null);
      try {
        const res = await markAllNotificationsReadAction();
        if (!res.success) throw new Error("refused");
      } catch {
        setFailure(MARK_ALL_FAILED);
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
      setUnread(0);
    });
  }, []);

  const handleBellClick = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const hasUnread = unread > 0;

  return (
    <div style={{ position: "relative" }}>
      <PanelButton
        buttonRef={buttonRef}
        open={open}
        count={unread}
        label={hasUnread ? `${String(unread)} notifications non lues` : "Notifications"}
        onClick={handleBellClick}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </PanelButton>

      {/* Panel */}
      {open && (
        <div
          className="card"
          ref={panelRef}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px var(--color-border-default)",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid var(--color-border-subtle)",
              position: "sticky",
              top: 0,
              background: "var(--color-bg-elevated)",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className="mono-label"
                style={{
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 1,
                    background: "var(--cosmetic-accent)",
                    display: "inline-block",
                  }}
                />
                Notifications
              </span>
              {hasUnread && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--cosmetic-accent)",
                    background: "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 20%, transparent)",
                    padding: "2px 6px",
                  }}
                >
                  {String(unread)} non lue{unread > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="link-action mono-label mono-label--xs"
                style={{
                  color: "var(--color-info)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Tout lire
              </button>
            )}
          </div>

          {failure !== null && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "12px 18px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                lineHeight: 1.5,
                color: "var(--color-danger)",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              {failure}
            </p>
          )}

          {/* List */}
          {isPending && !loaded ? (
            <div
              style={{
                padding: "32px 18px",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--color-text-muted)",
              }}
            >
              Chargement…
            </div>
          ) : !loaded && failure === LOAD_FAILED ? null : items.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center" }}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-border-default)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: 10, margin: "0 auto 10px" }}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  margin: 0,
                }}
              >
                Aucune notification
              </p>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  waiting={waiting}
                  onRead={handleMarkRead}
                  onFollow={close}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "Accepter" and "Refuser" under a friend request's notice, beside its link
 * rather than inside it: a control inside a link is two controls in one.
 * Refusing removes only a request still waiting (declineFriendRequestAction),
 * never a friendship accepted elsewhere since the notice arrived. Once
 * answered, the notice says how, and is read.
 */
function FriendRequestAnswer({
  senderId,
  onAnswered,
}: {
  senderId: string;
  onAnswered: () => void;
}): React.JSX.Element {
  const [pending, start] = useTransition();
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = (accept: boolean): void => {
    setError(null);
    start(async () => {
      let result: FriendActionResult;
      try {
        result = accept
          ? await acceptFriendRequestAction(senderId)
          : await declineFriendRequestAction(senderId);
      } catch {
        setError("Impossible pour l'instant. Réessaie dans un moment.");
        return;
      }
      if (result.ok) {
        setSaid(REQUEST_ANSWERED_LABEL[accept ? "accepted" : "declined"]);
        onAnswered();
      } else if (result.error === undefined || result.error === REQUEST_GONE_LABEL) {
        // Answered from the friends panel or the profile, or taken back:
        // nothing left to answer, so the buttons go.
        setSaid(REQUEST_GONE_LABEL);
        onAnswered();
      } else {
        setError(result.error);
      }
    });
  };

  if (said !== null) {
    return (
      <p className="notif-answer notif-answer--said" role="status">
        {said}
      </p>
    );
  }
  return (
    <div className="notif-answer" role="group" aria-label="Répondre à la demande d'ami">
      <button
        type="button"
        className="btn btn--accent btn--sm"
        disabled={pending}
        onClick={() => {
          answer(true);
        }}
      >
        Accepter
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={pending}
        onClick={() => {
          answer(false);
        }}
      >
        Refuser
      </button>
      {error !== null && (
        <span className="notif-answer-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** Whether a notice's link is one of the site's route handlers, not a page. */
function isRouteHandler(href: string): boolean {
  return href === "/api" || href.startsWith("/api/");
}

/**
 * One notice. A notice that leads somewhere is a link, one that only needs
 * reading is a button that marks it read, and a read one with nowhere to go
 * is plain text: a row is a control only when there is something to do.
 *
 * It used to be a clickable <div>: no role, out of the tab order, deaf to
 * Enter, and following it reloaded the whole site.
 */
function NotificationRow({
  item,
  waiting,
  onRead,
  onFollow,
}: {
  item: NotificationItem;
  /** The senders whose request still waits on the reader. */
  waiting: ReadonlySet<string>;
  onRead: (id: string) => void;
  onFollow: () => void;
}): React.JSX.Element {
  // A friend request still waiting is answered from the notice itself: its
  // row and the two buttons under it, side by side in one item.
  const sender = friendRequestSender(item);
  const row = <NoticeRow item={item} onRead={onRead} onFollow={onFollow} />;
  if (sender === null || !waiting.has(sender)) return row;
  return (
    <div className="notif-item">
      {row}
      <FriendRequestAnswer
        senderId={sender}
        onAnswered={() => {
          if (!item.readAt) onRead(item.id);
        }}
      />
    </div>
  );
}

/** The notice itself: a link, a button, or text, as described above. */
function NoticeRow({
  item,
  onRead,
  onFollow,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onFollow: () => void;
}): React.JSX.Element {
  const isUnread = !item.readAt;
  // No fallback: the record is exhaustive over the enum, so there is no type
  // that can arrive here without an icon.
  const icon = TYPE_ICON[item.type];
  // The unit follows the gap, as in the app: it used to be minutes whatever
  // the gap, so last week read "il y a 10 080 minutes". A row pushed by
  // Realtime carries the date as a string, which the helper reads too.
  const dateStr = notificationAge(item.createdAt, Date.now());
  const style: React.CSSProperties = {
    background: isUnread
      ? "color-mix(in srgb, var(--cosmetic-accent) 2%, transparent)"
      : "transparent",
  };

  const content = (
    <>
      {/* Icon */}
      {item.type === "BADGE_EARNED" ? (
        <BadgeMedallion rarity={badgeRarityFromMeta(item)} size="xs" style={{ flexShrink: 0 }} />
      ) : FRIEND_TYPES.has(item.type) ? (
        <span
          style={{
            width: 32,
            height: 32,
            background: isUnread
              ? "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)"
              : "rgba(42,37,96,0.3)",
            border: `1px solid ${isUnread ? "color-mix(in srgb, var(--cosmetic-accent) 26%, transparent)" : "var(--color-border-subtle)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FriendGlyph accepted={item.type === "FRIEND_ACCEPTED"} />
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            background: isUnread
              ? "color-mix(in srgb, var(--cosmetic-accent) 8%, transparent)"
              : "rgba(42,37,96,0.3)",
            border: `1px solid ${isUnread ? "color-mix(in srgb, var(--cosmetic-accent) 20%, transparent)" : "var(--color-border-subtle)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}

      {/* Content: spans, so the row stays valid inside a button. */}
      <span style={{ display: "block", flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: isUnread ? 600 : 400,
            color: isUnread ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            marginBottom: 3,
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            marginBottom: 4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.body}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-text-faint)",
            letterSpacing: "0.06em",
          }}
        >
          {dateStr}
        </span>
      </span>

      {/* Unread dot */}
      {isUnread && (
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            background: "var(--cosmetic-accent)",
            borderRadius: 999,
            marginTop: 6,
            flexShrink: 0,
            boxShadow: "0 0 6px color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)",
          }}
        />
      )}
    </>
  );

  if (item.actionUrl) {
    const follow = (event: React.MouseEvent<HTMLAnchorElement>): void => {
      if (isUnread) onRead(item.id);
      // A new tab leaves this one where it was, panel included.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      onFollow();
    };
    // A route handler is not a page the router can open: it would fetch it as
    // one, fail, and fall back to loading it anyway. A plain link loads it
    // once. Certificate notices used to point at the PDF route; the stored
    // ones were rewritten (migration 20261011120000_certificate_notice_links),
    // and this keeps any other route handler off the router.
    if (isRouteHandler(item.actionUrl)) {
      return (
        <a href={item.actionUrl} className="notif-row" style={style} onClick={follow}>
          {content}
        </a>
      );
    }
    return (
      <Link
        href={item.actionUrl}
        // Twenty rows open at once: fetching every page they point at, on
        // the chance one is clicked, is twenty requests for one click.
        prefetch={false}
        className="notif-row"
        style={style}
        onClick={follow}
      >
        {content}
      </Link>
    );
  }

  if (isUnread) {
    return (
      <button
        type="button"
        className="notif-row"
        style={style}
        onClick={() => {
          onRead(item.id);
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="notif-row" style={style}>
      {content}
    </div>
  );
}
