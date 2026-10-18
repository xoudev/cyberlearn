import React from "react";
import type { Metadata } from "next";
import { notificationRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  cursorToJson,
  NOTIFICATION_HISTORY_PAGE,
  unreadOnlyParam,
} from "@/lib/notifications/history";
import { NOTIFICATIONS_HEAD } from "./_components/notifications-head";
import { NotificationHistory } from "./_components/notification-history";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

/**
 * The notification history: everything the panel's last twenty leave out,
 * newest first, the unread ones alone under ?unread=1.
 *
 * The panel was the only place a notice could be read again, and a notice
 * older than its twentieth row could not be found at all.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const unreadOnly = unreadOnlyParam((await searchParams).unread);
  const [page, unread] = await Promise.all([
    notificationRepository.findPage(user.id, {
      before: undefined,
      take: NOTIFICATION_HISTORY_PAGE,
      unreadOnly,
    }),
    notificationRepository.findUnreadCount(user.id),
  ]);

  return (
    <div className="page-container">
      <PageHeader
        crumb={NOTIFICATIONS_HEAD.crumb}
        eyebrow={
          <>
            NOTIFICATIONS · <b>{unread}</b> NON LUE{unread > 1 ? "S" : ""}
          </>
        }
        title={NOTIFICATIONS_HEAD.title}
        lede={NOTIFICATIONS_HEAD.lede}
      />

      <NotificationHistory
        // Keyed on the filter: switching it starts the list over.
        key={unreadOnly ? "unread" : "all"}
        initialItems={page.items}
        initialNext={cursorToJson(page.next)}
        initialUnread={unread}
        unreadOnly={unreadOnly}
      />
    </div>
  );
}
