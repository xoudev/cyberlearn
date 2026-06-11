import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";

export const metadata: Metadata = { title: "Aperçu" };

const DANGER = "#FF4D6D";
const BORDER = "#1F1B47";
const TURQUOISE = "#0AFFD4";

function Corners({ color = TURQUOISE }: { color?: string }): React.ReactElement {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    borderStyle: "solid",
    borderWidth: 0,
    borderColor: color,
  };
  return (
    <>
      <span style={{ ...base, top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 }} />
      <span style={{ ...base, top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 }} />
      <span style={{ ...base, bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 }} />
      <span style={{ ...base, bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 }} />
    </>
  );
}

const ACTION_COLORS: Record<string, string> = {
  create: TURQUOISE,
  update: "#FFB020",
  delete: DANGER,
  login: "#6E8BFF",
  publish: TURQUOISE,
};

function getActionType(action: string): string {
  if (action.includes("create") || action.includes("import")) return "create";
  if (action.includes("delete") || action.includes("revoke")) return "delete";
  if (action.includes("login")) return "login";
  if (action.includes("publish")) return "publish";
  return "update";
}

function actionBorderColor(color: string): string {
  if (color === TURQUOISE) return "rgba(10,255,212,0.3)";
  if (color === DANGER) return "rgba(255,77,109,0.4)";
  if (color === "#FFB020") return "rgba(255,176,32,0.3)";
  return "rgba(110,139,255,0.35)";
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "aujourd'hui";
  if (diff < 2 * day) return "hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function DashboardPage(): Promise<React.ReactElement> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    usersThisWeek,
    lessonCount,
    lessonThisMonth,
    certCount,
    certThisWeek,
    openTickets,
    criticalTickets,
    recentLogs,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.lesson.count({ where: { status: "PUBLISHED" } }),
    prisma.lesson.count({ where: { status: "PUBLISHED", publishedAt: { gte: oneMonthAgo } } }),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.certificate.count({ where: { revokedAt: null, issuedAt: { gte: oneWeekAgo } } }),
    prisma.contactTicket.count({ where: { status: "OPEN" } }),
    prisma.contactTicket.count({ where: { status: "OPEN", theme: { in: ["BUG", "SECURITY"] } } }),
    prisma.auditLog.findMany({
      take: 7,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { username: true, displayName: true } } },
    }),
    prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, role: true, level: true, createdAt: true },
    }),
  ]);

  const stats = [
    {
      label: "Utilisateurs",
      val: userCount.toLocaleString("fr-FR"),
      delta: `+${String(usersThisWeek)} cette semaine`,
      arrow: "↑",
      danger: false,
    },
    {
      label: "Leçons publiées",
      val: lessonCount.toLocaleString("fr-FR"),
      delta: `+${String(lessonThisMonth)} ce mois-ci`,
      arrow: "↑",
      danger: false,
    },
    {
      label: "Certificats émis",
      val: certCount.toLocaleString("fr-FR"),
      delta: `+${String(certThisWeek)} cette semaine`,
      arrow: "↑",
      danger: false,
    },
    {
      label: "Tickets ouverts",
      val: openTickets.toLocaleString("fr-FR"),
      delta: `${String(criticalTickets)} critique${criticalTickets !== 1 ? "s" : ""}`,
      arrow: "!",
      danger: true,
    },
  ];

  const thHead: React.CSSProperties = {
    textAlign: "left",
    padding: "11px 16px",
    fontWeight: 700,
    fontSize: 9.5,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#6B6890",
    background: "rgba(5,4,26,0.6)",
    borderBottom: `1px solid ${BORDER}`,
  };

  const td: React.CSSProperties = {
    padding: "13px 16px",
    borderBottom: "1px solid rgba(31,27,71,0.5)",
    verticalAlign: "middle",
    color: "#B8B5D1",
  };

  return (
    <main className="admin-page-content">
      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#6B6890",
          marginBottom: 24,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: DANGER }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1" }}>cyberlearn</b>
        <span style={{ color: "#3F3D5C" }}>/</span>
        <b style={{ color: "#B8B5D1" }}>admin</b>
        <span style={{ color: "#3F3D5C" }}>/</span>
        <span style={{ color: "#F5F5FA" }}>aperçu</span>
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: DANGER,
            boxShadow: `0 0 6px ${DANGER}`,
            animation: "blink 1s step-end infinite",
            marginLeft: 4,
            verticalAlign: "-2px",
          }}
        />
      </div>

      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 28,
          paddingBottom: 24,
          borderBottom: `1px solid ${BORDER}`,
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(36px, 4.4vw, 52px)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
              margin: "0 0 10px",
            }}
          >
            Aperçu <em style={{ fontStyle: "normal", color: DANGER }}>{"// admin"}</em>
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: "#6B6890",
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: TURQUOISE }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: TURQUOISE,
                  boxShadow: `0 0 6px ${TURQUOISE}`,
                  animation: "pulse 1.5s ease-in-out infinite",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              SYSTÈME OPÉRATIONNEL
            </span>
            {"  "}·{"  "}synchronisation en direct
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="admin-stats-grid">
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              position: "relative",
              padding: "22px 22px 20px",
              background: s.danger
                ? `linear-gradient(135deg, rgba(255,77,109,0.08), transparent 60%), #0A0826`
                : "#0A0826",
              border: s.danger ? "1px solid rgba(255,77,109,0.4)" : `1px solid ${BORDER}`,
            }}
          >
            <Corners color={s.danger ? DANGER : TURQUOISE} />

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: s.danger ? DANGER : "#6B6890",
                marginBottom: 14,
              }}
            >
              {`// ${s.label}`}
            </div>

            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 38,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: s.danger ? DANGER : "#F5F5FA",
                marginBottom: 10,
                textShadow: s.danger ? "0 0 16px rgba(255,77,109,0.3)" : "none",
              }}
            >
              {s.val}
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "#6B6890",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: s.danger ? DANGER : TURQUOISE }}>{s.arrow}</span>
              <span>
                <b style={{ color: s.danger ? DANGER : TURQUOISE }}>
                  {s.delta.split(" ")[0] ?? ""}
                </b>{" "}
                {s.delta.split(" ").slice(1).join(" ")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert banner - only when open tickets exist */}
      {openTickets > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 22px",
            background: "rgba(255,181,71,0.08)",
            border: "1px solid rgba(255,181,71,0.4)",
            borderLeft: "3px solid #FFB547",
            marginBottom: 24,
            fontFamily: "var(--font-mono)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,181,71,0.15)",
              border: "1px solid rgba(255,181,71,0.5)",
              color: "#FFB547",
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2 L14 13 H2 Z" />
              <path d="M8 6 V9" />
              <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#FFB547",
                marginBottom: 3,
              }}
            >
              ⚠ {openTickets} ticket{openTickets !== 1 ? "s" : ""} en attente
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "#B8B5D1",
                letterSpacing: "0.02em",
                fontFamily: "var(--font-sans)",
              }}
            >
              {criticalTickets > 0
                ? `${String(criticalTickets)} critique${criticalTickets !== 1 ? "s" : ""} (bug ou sécurité) · action requise`
                : "Aucun ticket critique pour le moment"}
            </div>
          </div>
          <Link
            href="/tickets"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#FFB547",
              border: "1px solid rgba(255,181,71,0.5)",
              padding: "9px 14px",
              background: "rgba(255,181,71,0.06)",
              whiteSpace: "nowrap",
            }}
          >
            Voir les tickets →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 36 }}>
        {(
          [
            { label: "Nouvelle leçon →", href: "/lessons/new", primary: true },
            { label: "Importer MDX →", href: "/lessons/import", primary: false },
            { label: "Voir les tickets →", href: "/tickets", primary: false },
          ] as const
        ).map((btn) => (
          <Link
            key={btn.href}
            href={btn.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              border: btn.primary ? "1px solid #0024FF" : `1px solid ${BORDER}`,
              background: btn.primary ? "#0024FF" : "transparent",
              color: btn.primary ? "#fff" : "#B8B5D1",
              boxShadow: btn.primary
                ? "0 0 20px rgba(0,36,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            {btn.label}
          </Link>
        ))}
      </div>

      {/* 2-column tables */}
      <div className="admin-2col-grid">
        {/* Activity log */}
        <section style={{ background: "#0A0826", border: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#F5F5FA",
                margin: 0,
              }}
            >
              {"// activité "}
              <b style={{ color: DANGER }}>récente</b>
            </h2>
            <Link
              href="/audit"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
              }}
            >
              Voir audit log →
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["Action", "Acteur", "Cible", "Date"].map((h) => (
                    <th key={h} style={thHead}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ ...td, textAlign: "center", color: "#6B6890", padding: "40px 16px" }}
                    >
                      {"// aucune activité récente"}
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => {
                    const actType = getActionType(log.action);
                    const actColor = ACTION_COLORS[actType] ?? "#6B6890";
                    const actor = log.actor?.username ?? log.actor?.displayName ?? "system";
                    const initials = actor.slice(0, 2).toUpperCase();
                    const ts = new Intl.DateTimeFormat("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(log.createdAt);
                    const dt = formatRelativeDate(log.createdAt);

                    return (
                      <tr key={log.id}>
                        <td style={td}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              fontWeight: 700,
                              fontSize: 10.5,
                              letterSpacing: "0.06em",
                              padding: "3px 9px",
                              background: "rgba(5,4,26,0.6)",
                              border: `1px solid ${actionBorderColor(actColor)}`,
                              color: actColor,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                background: actColor,
                                transform: "rotate(45deg)",
                                boxShadow: `0 0 5px ${actColor}`,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            {log.action}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
                              }}
                            >
                              {initials}
                            </span>
                            @{actor}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ color: TURQUOISE }}>{log.targetType}</span>
                          {log.targetId && (
                            <span style={{ color: "#6B6890" }}> · {log.targetId.slice(0, 8)}</span>
                          )}
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 11, color: "#6B6890", whiteSpace: "nowrap" }}>
                            <b style={{ color: "#B8B5D1" }}>{ts}</b> · {dt}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent users */}
        <section style={{ background: "#0A0826", border: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#F5F5FA",
                margin: 0,
              }}
            >
              {"// "}
              <b style={{ color: DANGER }}>nouveaux</b>
              {" utilisateurs"}
            </h2>
            <Link
              href="/users"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
              }}
            >
              Tous →
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["Username", "Rôle", "Lvl", "Inscrit"].map((h) => (
                    <th key={h} style={thHead}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ ...td, textAlign: "center", color: "#6B6890", padding: "40px 16px" }}
                    >
                      {"// aucun utilisateur"}
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => {
                    const emailLocal = u.email.split("@")[0] ?? "anon";
                    const uname = u.username ? `@${u.username}` : emailLocal;
                    const initials = uname.replace("@", "").slice(0, 2).toUpperCase();
                    const isAdmin = u.role === "ADMIN";
                    const since = new Intl.DateTimeFormat("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(u.createdAt);

                    return (
                      <tr key={u.id}>
                        <td style={td}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              color: "#F5F5FA",
                            }}
                          >
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                background: isAdmin
                                  ? `linear-gradient(135deg, ${DANGER}, #8B1A2E)`
                                  : "#2A2560",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              {initials}
                            </span>
                            {uname}
                          </span>
                        </td>
                        <td style={td}>
                          {isAdmin ? (
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 9.5,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                color: "#fff",
                                background: DANGER,
                                padding: "3px 9px",
                                boxShadow: "0 0 8px rgba(255,77,109,0.4)",
                              }}
                            >
                              ADMIN
                            </span>
                          ) : (
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 9.5,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                color: "#6B6890",
                                border: `1px solid ${BORDER}`,
                                padding: "3px 9px",
                              }}
                            >
                              STUDENT
                            </span>
                          )}
                        </td>
                        <td style={td}>
                          <span style={{ fontWeight: 700, fontSize: 11, color: TURQUOISE }}>
                            <span style={{ color: "#6B6890", fontWeight: 500 }}>LVL·</span>
                            {String(u.level).padStart(2, "0")}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 11, color: "#6B6890", whiteSpace: "nowrap" }}>
                            {since}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
