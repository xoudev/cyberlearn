"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { NotificationItem } from "@cyberlearn/db";
import { NotificationRow } from "@/components/notification-panel";
import type { NotificationCursorJson } from "@/lib/notifications/history";
import {
  announceRead,
  markItemsRead,
  onReadElsewhere,
  unreadAfter,
} from "@/lib/notifications/read-sync";
import {
  getNotificationPageAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/_actions/notification-actions";

/** The panel closes when a row is followed; the page has nothing to close. */
const stay = (): void => undefined;

const LOAD_FAILED = "Impossible de charger la suite pour l'instant. Réessaie dans un moment.";
const MARK_ALL_FAILED =
  "Impossible de tout marquer comme lu pour l'instant. Réessaie dans un moment.";

/**
 * Every notification the account still has, newest first, thirty at a time.
 *
 * A client component for what happens on the rows: following one marks it
 * read, as in the panel, "Charger plus" asks for the rows after the last one
 * shown, and "Tout marquer comme lu" clears the unread ones without
 * reloading the list. The filter is a link: the page reads it from the URL.
 *
 * What is marked read here, the bell's badge and panel are told, and what
 * the panel marks read, this list follows (lib/notifications/read-sync.ts).
 */
export function NotificationHistory({
  initialItems,
  initialNext,
  initialUnread,
  unreadOnly,
}: {
  initialItems: NotificationItem[];
  initialNext: NotificationCursorJson | null;
  initialUnread: number;
  unreadOnly: boolean;
}): React.JSX.Element {
  const [items, setItems] = useState(initialItems);
  const [next, setNext] = useState(initialNext);
  const [unread, setUnread] = useState(initialUnread);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, startLoadingMore] = useTransition();
  // The rows as last drawn, for news from the panel to be weighed against.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(
    () =>
      onReadElsewhere("history", (news) => {
        setUnread((count) => unreadAfter(count, itemsRef.current, news));
        setItems((prev) => markItemsRead(prev, news, new Date()));
      }),
    [],
  );

  function markRead(id: string): void {
    startTransition(async () => {
      try {
        const res = await markNotificationReadAction(id);
        if (!res.success) return;
      } catch {
        // The row stays unread, which is the truth; following its link still works.
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
      setUnread((count) => Math.max(0, count - 1));
      announceRead({ source: "history", ids: [id] });
    });
  }

  function markAllRead(): void {
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
      announceRead({ source: "history", all: true });
    });
  }

  function loadMore(): void {
    if (next === null) return;
    startLoadingMore(async () => {
      setFailure(null);
      try {
        const res = await getNotificationPageAction({ before: next, unreadOnly });
        if (!res.success) throw new Error("refused");
        // A row already shown is not shown twice, whatever arrived meanwhile.
        setItems((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...res.notifications.filter((n) => !seen.has(n.id))];
        });
        setNext(res.next);
      } catch {
        setFailure(LOAD_FAILED);
      }
    });
  }

  return (
    <>
      <nav className="tabs" aria-label="Filtrer les notifications">
        <Link
          href="/notifications"
          className="tabs__tab"
          data-active={!unreadOnly}
          aria-current={!unreadOnly ? "page" : undefined}
        >
          Toutes
        </Link>
        <Link
          href="/notifications?unread=1"
          className="tabs__tab"
          data-active={unreadOnly}
          aria-current={unreadOnly ? "page" : undefined}
        >
          Non lues <b className="tabs__count">{unread}</b>
        </Link>
        {unread > 0 && (
          <div className="tabs__trailing">
            <button
              type="button"
              onClick={markAllRead}
              disabled={isPending}
              className="btn btn--ghost btn--sm"
            >
              Tout marquer comme lu
            </button>
          </div>
        )}
      </nav>

      {failure !== null && (
        <p role="alert" className="mono-label" style={{ color: "var(--color-danger)" }}>
          {failure}
        </p>
      )}

      {items.length === 0 ? (
        <p className="cls-empty">
          {unreadOnly
            ? "Tu as tout lu. Les nouvelles notifications apparaîtront ici."
            : "Aucune notification pour l'instant. Tes badges, tes montées de niveau, tes certificats et les réponses à tes messages arriveront ici."}
        </p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={markRead} onFollow={stay} />
          ))}
        </div>
      )}

      {next !== null && (
        <p style={{ marginTop: 20, textAlign: "center" }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="btn btn--ghost btn--sm"
          >
            {isLoadingMore ? "Chargement…" : "Charger plus"}
          </button>
        </p>
      )}
    </>
  );
}
