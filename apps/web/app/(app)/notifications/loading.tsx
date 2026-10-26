import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "@/components/page-header";
import { NOTIFICATIONS_HEAD } from "./_components/notifications-head";

/**
 * The history while it loads: its header as it will read, the two filters,
 * then rows drawn on .notif-row (the icon, the title, two lines of text and
 * the age).
 */

const TITLES = ["52%", "38%", "64%", "46%", "58%", "41%"] as const;

export default function NotificationsLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement de tes notifications">
      <PageHeader
        crumb={NOTIFICATIONS_HEAD.crumb}
        eyebrow={<Skeleton as="span" w={150} h={11} aria-hidden="true" />}
        title={NOTIFICATIONS_HEAD.title}
        lede={NOTIFICATIONS_HEAD.lede}
      />

      <div className="tabs" aria-hidden="true">
        <span className="tabs__tab">
          <Skeleton as="span" w={52} h={11} />
        </span>
        <span className="tabs__tab">
          <Skeleton as="span" w={84} h={11} />
        </span>
      </div>

      <div className="card" style={{ padding: 0 }} aria-hidden="true">
        {TITLES.map((title) => (
          <div key={title} className="notif-row">
            <Skeleton w={32} h={32} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
              <Skeleton w={title} h={13} />
              <Skeleton w="88%" h={10} />
              <Skeleton w={70} h={8} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
