import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auditLogRepository } from "@cyberlearn/db";
import { PageHeader, Tag, UserAvatar, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../_components/data-grid";
import { AuditFilters } from "./_components/audit-filters";
import { AUDIT_COLUMNS, AUDIT_HEADER } from "./_components/columns";
import { AUDIT_EXPORT_MAX, auditActorName } from "@/lib/audit-export";
import { gridHref } from "@/lib/grid-href";
import type { RawParams } from "@/lib/grid-params";
import {
  AUDIT_PAGE_SIZE,
  auditListSearch,
  auditQueryOf,
  parseAuditListParams,
  withKnownAction,
} from "@/lib/list-params";

import { requireAdminPage } from "@/lib/auth";
import { resolveAvatarSrcs } from "@/lib/avatar";

export const metadata: Metadata = { title: "Audit log" };

const ACTION_TONES: Record<string, Tone> = {
  create: "success",
  import: "success",
  publish: "success",
  update: "warning",
  delete: "danger",
  revoke: "danger",
  login: "info",
};

function actionTone(action: string): Tone {
  for (const [key, tone] of Object.entries(ACTION_TONES)) {
    if (action.includes(key)) return tone;
  }
  return "neutral";
}

function formatTs(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
}

/**
 * The audit log, a page of 50 at a time under the filters of the URL (actor,
 * target, action, from, to). It used to read the last 500 entries and filter
 * those in the browser: anything older could not be found, even by its date.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const actions = await auditLogRepository.actionNames();
  const params = withKnownAction(parseAuditListParams(await searchParams), actions);
  const slice = await auditLogRepository.list(auditQueryOf(params));
  const search = auditListSearch({ ...params, page: slice.page });

  // The export reads the same filter, every page of it.
  const exportHref = gridHref("/audit/export", search, { page: null });
  const tooLarge = slice.total > AUDIT_EXPORT_MAX;

  const avatars = await resolveAvatarSrcs(slice.rows.map((log) => log.actor?.avatarUrl));

  const rows: GridRowBase[] = slice.rows.map((log, index) => {
    const actor = log.actor?.username ? `@${log.actor.username}` : auditActorName(log);
    const actorName =
      log.actor !== null && log.actor.displayName.trim() !== "" ? log.actor.displayName : actor;
    const metaStr = log.metadata !== null ? JSON.stringify(log.metadata) : null;

    return {
      id: log.id,
      cells: [
        <Tag key="a" tone={actionTone(log.action)}>
          {log.action}
        </Tag>,
        // A name narrows the log to that account's gestures.
        log.actorId !== null ? (
          <Link
            key="ac"
            href={gridHref("/audit", search, { actor: log.actorId })}
            title="Voir les gestes de ce compte"
            className="a-person"
          >
            <UserAvatar src={avatars[index] ?? null} name={actorName} size={26} />
            <span className="mono">{actor}</span>
          </Link>
        ) : (
          <span key="ac" className="a-person">
            <UserAvatar src={null} name={actor} size={26} />
            <span className="mono" style={{ color: "var(--a-muted)" }}>
              {actor}
            </span>
          </span>
        ),
        <span key="t" className="mono">
          <span style={{ color: "var(--a-fg-2)" }}>{log.targetType}</span>
          {log.targetId && (
            <Link
              href={gridHref("/audit", search, { target: log.targetId })}
              title="Voir tout ce qui a touché cette cible"
              style={{ color: "var(--a-muted)" }}
            >
              {" "}
              · {log.targetId.slice(0, 8)}
            </Link>
          )}
        </span>,
        metaStr ? (
          <span
            key="m"
            className="mono"
            title={metaStr}
            style={{
              display: "inline-block",
              maxWidth: 240,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 10.5,
              color: "var(--a-muted)",
              verticalAlign: "middle",
            }}
          >
            {metaStr}
          </span>
        ) : (
          <span key="m" style={{ color: "var(--a-muted)" }}>
            Aucun détail
          </span>
        ),
        <span key="d" className="mono" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
          {formatTs(log.createdAt)}
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={AUDIT_HEADER.crumbs}
        title={AUDIT_HEADER.title}
        description={`${slice.total.toLocaleString("fr-FR")} entrée${slice.total !== 1 ? "s" : ""} pour ce filtre · rétention 1 an. Chaque action d'administration est journalisée avec son acteur et sa cible.`}
        actions={
          slice.total > 0 && !tooLarge ? (
            // A plain link: the file comes from a route, not a page the
            // router could render.
            <a href={exportHref} className="a-btn a-btn--ghost" download>
              Exporter en CSV
            </a>
          ) : undefined
        }
      />

      {tooLarge && (
        <p className="a-form-notice" style={{ marginBottom: 18 }}>
          L&apos;export est limité à {AUDIT_EXPORT_MAX.toLocaleString("fr-FR")} lignes, et ce filtre
          en compte {slice.total.toLocaleString("fr-FR")}. Resserre-le (une période plus courte, une
          action, un acteur) pour l&apos;exporter.
        </p>
      )}

      <DataGrid
        columns={AUDIT_COLUMNS}
        rows={rows}
        server={{
          path: "/audit",
          params: search,
          total: slice.total,
          page: slice.page,
          pageSize: AUDIT_PAGE_SIZE,
          sort: { key: "date", dir: params.dir },
          defaultSort: { key: "date", dir: "desc" },
          searchKey: null,
        }}
        toolbar={<AuditFilters params={search} actions={actions} />}
        emptyTitle="Aucune entrée"
        emptyText="Le journal ne contient rien pour ces critères."
      />
    </main>
  );
}
