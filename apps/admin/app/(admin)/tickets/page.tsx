import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { TicketStatusSelect } from "./_components/TicketStatusSelect";

export const metadata: Metadata = { title: "Tickets" };

const BORDER = "#1F1B47";
const DANGER = "#FF4D6D";

const THEME_LABEL: Record<string, { label: string; color: string }> = {
  BUG: { label: "Bug", color: "#FF4757" },
  QUESTION: { label: "Question", color: "#4D8BFF" },
  FEATURE_REQUEST: { label: "Feature Request", color: "#B14DFF" },
  SECURITY: { label: "Sécurité", color: DANGER },
  CONTENT_ERROR: { label: "Erreur de contenu", color: "#FFB020" },
  OTHER: { label: "Autre", color: "#6B6890" },
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#FF4757",
  IN_PROGRESS: "#FFB020",
  RESOLVED: "#0AFFD4",
  CLOSED: "#44406B",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#44406B",
  padding: "12px 16px",
};

const tdStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderBottom: "1px solid rgba(31,27,71,0.4)",
  verticalAlign: "middle",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

export default async function AdminTicketsPage(): Promise<React.ReactElement> {
  const tickets = await prisma.contactTicket.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      subject: true,
      theme: true,
      status: true,
      email: true,
      jiraIssueKey: true,
      jiraIssueUrl: true,
      createdAt: true,
      user: { select: { username: true, displayName: true } },
    },
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "RESOLVED" || t.status === "CLOSED",
  ).length;

  function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div>
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
            Admin / Tickets
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
            Tickets ({String(tickets.length)})
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              margin: "6px 0 0",
            }}
          >
            <span style={{ color: "#FF4757" }}>{String(openCount)} ouverts</span>
            {" · "}
            <span style={{ color: "#FFB020" }}>{String(inProgressCount)} en cours</span>
            {" · "}
            {String(resolvedCount)} résolus
          </p>
        </div>
      </div>

      {/* Alert: open critical tickets */}
      {tickets.some(
        (t) =>
          (t.status === "OPEN" || t.status === "IN_PROGRESS") &&
          (t.theme === "BUG" || t.theme === "SECURITY"),
      ) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            background: "rgba(255,77,109,0.07)",
            border: "1px solid rgba(255,77,109,0.35)",
            borderLeft: `3px solid ${DANGER}`,
            marginBottom: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#B8B5D1",
          }}
        >
          <span style={{ color: DANGER, fontWeight: 700, letterSpacing: "0.1em" }}>⚠ ALERTE</span>
          Tickets critiques (Bug / Sécurité) en attente de traitement.
        </div>
      )}

      {tickets.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            border: `1px dashed ${BORDER}`,
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
            {"// aucun ticket pour l'instant"}
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
                <th style={{ ...thStyle, textAlign: "left" }}>Sujet</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Thème</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Utilisateur</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Jira</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Date</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const themeInfo = THEME_LABEL[t.theme] ?? { label: t.theme, color: "#6B6890" };
                const isCritical = t.theme === "BUG" || t.theme === "SECURITY";
                const userLabel = t.user?.username
                  ? `@${t.user.username}`
                  : (t.user?.displayName ?? t.email);
                const statusColor = STATUS_COLORS[t.status] ?? "#6B6890";
                const statusLabel = STATUS_LABELS[t.status] ?? t.status;

                return (
                  <tr
                    key={t.id}
                    style={{
                      background:
                        isCritical && t.status === "OPEN" ? "rgba(255,77,109,0.03)" : "transparent",
                    }}
                  >
                    <td style={{ ...tdStyle, maxWidth: 300 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#F5F5FA",
                          fontSize: 13,
                          marginBottom: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {isCritical && <span style={{ color: DANGER, marginRight: 6 }}>!</span>}
                        {t.subject}
                      </div>
                      <div style={{ fontSize: 10, color: "#44406B" }}>{t.id.slice(0, 8)}</div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 10px",
                          background: `${themeInfo.color}14`,
                          border: `1px solid ${themeInfo.color}30`,
                          color: themeInfo.color,
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {themeInfo.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#6B6890", fontSize: 11 }}>{userLabel}</td>
                    <td style={tdStyle}>
                      {t.jiraIssueKey && t.jiraIssueUrl ? (
                        <a
                          href={t.jiraIssueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#4D8BFF",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {t.jiraIssueKey} ↗
                        </a>
                      ) : (
                        <span style={{ color: "#44406B" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontSize: 11,
                        color: "#44406B",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(t.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {t.status === "RESOLVED" || t.status === "CLOSED" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: statusColor,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: statusColor,
                              flexShrink: 0,
                            }}
                          />
                          {statusLabel}
                        </span>
                      ) : (
                        <TicketStatusSelect
                          ticketId={t.id}
                          currentStatus={t.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"}
                        />
                      )}
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
