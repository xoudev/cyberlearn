import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { Monogram, PageHeader, Tag, UI, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";

export const metadata: Metadata = { title: "Audit log" };

const ACTION_TONES: Record<string, Tone> = {
  create: "accent",
  import: "accent",
  publish: "accent",
  update: "warning",
  delete: "danger",
  revoke: "danger",
  login: "info",
};

function actionKind(action: string): string {
  for (const key of Object.keys(ACTION_TONES)) {
    if (action.includes(key)) return key;
  }
  return "other";
}

function formatTs(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export default async function AdminAuditPage(): Promise<React.ReactElement> {
  const logs = await prisma.auditLog.findMany({
    take: 500,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { username: true, displayName: true, email: true } },
    },
  });

  const rows: GridRow[] = logs.map((log) => {
    const actorRecord = log.actor;
    const actor = actorRecord?.username
      ? `@${actorRecord.username}`
      : (actorRecord?.displayName ?? actorRecord?.email.split("@").at(0) ?? "system");
    const metaStr = log.metadata ? JSON.stringify(log.metadata) : null;
    const kind = actionKind(log.action);

    return {
      id: log.id,
      search: `${log.action} ${actor} ${log.targetType} ${metaStr ?? ""}`.toLowerCase(),
      facets: [kind],
      sort: [
        log.action,
        actor.toLowerCase(),
        log.targetType,
        metaStr ?? "",
        log.createdAt.getTime(),
      ],
      cells: [
        <Tag key="a" tone={ACTION_TONES[kind] ?? "neutral"}>
          {log.action}
        </Tag>,
        <span key="ac" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Monogram text={actor.replace("@", "")} size={22} />
          <span className="mono">{actor}</span>
        </span>,
        <span key="t" className="mono">
          <span style={{ color: UI.turquoise }}>{log.targetType}</span>
          {log.targetId && <span style={{ color: UI.muted }}> · {log.targetId.slice(0, 8)}</span>}
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
              color: UI.muted,
              verticalAlign: "middle",
            }}
          >
            {metaStr}
          </span>
        ) : (
          <span key="m" style={{ color: UI.muted }}>
            Aucun détail
          </span>
        ),
        <span key="d" className="mono" style={{ color: UI.muted, whiteSpace: "nowrap" }}>
          {formatTs(log.createdAt)}
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Système"
        title="Audit log"
        description={`${String(logs.length)} entrées récentes · rétention 1 an. Chaque action d'administration est journalisée avec son acteur et sa cible.`}
      />

      <DataGrid
        columns={[
          { label: "Action", sortable: true },
          { label: "Acteur", sortable: true },
          { label: "Cible", sortable: true },
          { label: "Métadonnées" },
          { label: "Horodatage", sortable: true },
        ]}
        rows={rows}
        facets={[
          {
            label: "Type",
            options: [
              { value: "create", label: "Création" },
              { value: "import", label: "Import" },
              { value: "publish", label: "Publication" },
              { value: "update", label: "Mise à jour" },
              { value: "delete", label: "Suppression" },
              { value: "revoke", label: "Révocation" },
              { value: "login", label: "Connexion" },
              { value: "other", label: "Autre" },
            ],
          },
        ]}
        pageSize={25}
        searchPlaceholder="Rechercher une action, un acteur, une cible…"
        emptyTitle="Aucune entrée"
        emptyText="Le journal ne contient rien pour ces critères."
      />
    </main>
  );
}
