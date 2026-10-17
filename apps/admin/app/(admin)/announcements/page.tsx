import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auditLogRepository, classRepository } from "@cyberlearn/db";
import { PageHeader } from "../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../_components/data-grid";
import { AnnouncementForm } from "./_components/announcement-form";
import { ANNOUNCEMENTS_HEADER, HISTORY_COLUMNS, HISTORY_PAGE_SIZE } from "./_components/columns";
import { ANNOUNCEMENT_ACTION, readAnnouncementTrace } from "@/lib/announcement";
import { auditActorName } from "@/lib/audit-export";
import { gridHref } from "@/lib/grid-href";
import { pageParam, type RawParams } from "@/lib/grid-params";
import { learnerUrl } from "@/lib/learner-url";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Annonces" };

function formatTs(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
}

const MUTED: React.CSSProperties = { color: "var(--a-muted)" };

/**
 * Announcements: the form that sends one, and those already sent.
 *
 * There is no table of announcements. Each send writes one audit row carrying
 * the title, the message, the link and who it went to, and the history below
 * is that row read back: the log keeps it as long as it keeps everything else
 * (a year), and a second copy elsewhere could only disagree with it.
 */
export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const page = pageParam(await searchParams);
  const [classes, slice] = await Promise.all([
    classRepository.listLiveOptions(),
    auditLogRepository.list({
      filter: { action: ANNOUNCEMENT_ACTION },
      dir: "desc",
      page,
      pageSize: HISTORY_PAGE_SIZE,
    }),
  ]);
  const search: Record<string, string> = slice.page > 1 ? { page: String(slice.page) } : {};

  const rows: GridRowBase[] = slice.rows.map((log) => {
    const trace = readAnnouncementTrace(log.metadata);
    const actor = log.actor?.username ? `@${log.actor.username}` : auditActorName(log);
    return {
      id: log.id,
      cells: [
        <span key="a" style={{ display: "grid", gap: 3, maxWidth: 420 }}>
          <b>{trace?.title ?? "Annonce illisible"}</b>
          {trace !== null && trace.body !== "" && (
            <span
              title={trace.body}
              style={{
                ...MUTED,
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trace.body}
            </span>
          )}
        </span>,
        <span key="r" style={{ display: "grid", gap: 3 }}>
          <span className="mono">
            {trace !== null
              ? `${trace.recipients.toLocaleString("fr-FR")} compte${trace.recipients > 1 ? "s" : ""}`
              : "?"}
          </span>
          <span style={{ ...MUTED, fontSize: 12 }}>{trace?.audienceLabel}</span>
        </span>,
        trace?.actionUrl ? (
          <a
            key="l"
            href={learnerUrl(trace.actionUrl)}
            target="_blank"
            rel="noreferrer"
            className="mono"
          >
            {trace.actionUrl}
          </a>
        ) : (
          <span key="l" style={MUTED}>
            Aucun
          </span>
        ),
        log.actorId !== null ? (
          <Link
            key="ac"
            href={gridHref("/audit", {}, { actor: log.actorId, action: ANNOUNCEMENT_ACTION })}
            title="Voir les annonces de ce compte dans l'audit log"
            className="mono"
          >
            {actor}
          </Link>
        ) : (
          <span key="ac" className="mono" style={MUTED}>
            {actor}
          </span>
        ),
        <span key="d" className="mono" style={{ ...MUTED, whiteSpace: "nowrap" }}>
          {formatTs(log.createdAt)}
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={ANNOUNCEMENTS_HEADER.crumbs}
        title={ANNOUNCEMENTS_HEADER.title}
        description={ANNOUNCEMENTS_HEADER.description}
      />

      <div className="a-stack">
        <AnnouncementForm classes={classes} />

        <DataGrid
          columns={HISTORY_COLUMNS}
          rows={rows}
          server={{
            path: "/announcements",
            params: search,
            total: slice.total,
            page: slice.page,
            pageSize: HISTORY_PAGE_SIZE,
            searchKey: null,
          }}
          toolbar={
            <Link
              href={gridHref("/audit", {}, { action: ANNOUNCEMENT_ACTION })}
              className="a-btn a-btn--ghost a-btn--sm"
            >
              Ouvrir dans l&apos;audit log
            </Link>
          }
          emptyTitle="Aucune annonce envoyée"
          emptyText="Chaque annonce envoyée d'ici s'ajoute à cette liste, lue dans l'audit log."
        />
      </div>
    </main>
  );
}
