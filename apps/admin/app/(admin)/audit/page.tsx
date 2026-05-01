import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";

export const metadata: Metadata = { title: "Audit Log" };

const BORDER = "#1F1B47";
const DANGER = "#FF4D6D";
const TURQUOISE = "#0AFFD4";

interface ActionStyle {
  color: string;
  border: string;
}
const ACTION_DEFAULT: ActionStyle = { color: "#6B6890", border: "rgba(107,104,144,0.3)" };
const ACTION_STYLES: Record<string, ActionStyle> = {
  create: { color: TURQUOISE, border: "rgba(10,255,212,0.3)" },
  import: { color: TURQUOISE, border: "rgba(10,255,212,0.3)" },
  publish: { color: TURQUOISE, border: "rgba(10,255,212,0.3)" },
  update: { color: "#FFB020", border: "rgba(255,176,32,0.3)" },
  delete: { color: DANGER, border: "rgba(255,77,109,0.4)" },
  revoke: { color: DANGER, border: "rgba(255,77,109,0.4)" },
  login: { color: "#4D8BFF", border: "rgba(77,139,255,0.35)" },
};

function getActionStyle(action: string): ActionStyle {
  for (const [key, style] of Object.entries(ACTION_STYLES)) {
    if (action.includes(key)) return style;
  }
  return ACTION_DEFAULT;
}

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#44406B",
  padding: "12px 16px",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid rgba(31,27,71,0.4)",
  verticalAlign: "middle",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
};

export default async function AdminAuditPage(): Promise<React.ReactElement> {
  const logs = await prisma.auditLog.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { username: true, displayName: true, email: true } },
    },
  });

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

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ width: 14, height: 1, background: DANGER, display: "inline-block" }} />
          Admin / Audit Log
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          Audit Log
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            margin: "6px 0 0",
          }}
        >
          {String(logs.length)} entrées récentes — rétention 1 an
        </p>
      </div>

      {logs.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            border: `1px dashed ${BORDER}`,
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
            {"// aucune entrée dans le journal"}
          </p>
        </div>
      ) : (
        <div
          className="admin-table-wrap"
          style={{ background: "rgba(5,4,26,0.4)", border: `1px solid ${BORDER}` }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Action</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Acteur</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Cible</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Métadonnées</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Horodatage</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const style = getActionStyle(log.action);
                const actorRecord = log.actor;
                const actor = actorRecord?.username
                  ? `@${actorRecord.username}`
                  : (actorRecord?.displayName ?? actorRecord?.email.split("@").at(0) ?? "system");
                const initials = actor.replace("@", "").slice(0, 2).toUpperCase();

                const metaStr = log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : null;

                return (
                  <tr key={log.id}>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          fontWeight: 700,
                          fontSize: 10.5,
                          letterSpacing: "0.06em",
                          padding: "4px 10px",
                          background: "rgba(5,4,26,0.6)",
                          border: `1px solid ${style.border}`,
                          color: style.color,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            background: style.color,
                            transform: "rotate(45deg)",
                            flexShrink: 0,
                          }}
                        />
                        {log.action}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            background: "#2A2560",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#B8B5D1",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </span>
                        <span style={{ color: "#B8B5D1" }}>{actor}</span>
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: TURQUOISE }}>{log.targetType}</span>
                      {log.targetId && (
                        <span style={{ color: "#44406B" }}> · {log.targetId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 200, color: "#44406B", fontSize: 10 }}>
                      {metaStr ? (
                        <span title={JSON.stringify(log.metadata)}>
                          {metaStr}
                          {metaStr.length >= 60 ? "…" : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        color: "#44406B",
                      }}
                    >
                      {formatTs(log.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
