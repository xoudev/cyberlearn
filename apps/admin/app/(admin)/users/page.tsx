import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { RoleToggleButton } from "./_components/RoleToggleButton";

export const metadata: Metadata = { title: "Utilisateurs" };

const BORDER = "#1F1B47";
const DANGER = "#FF4D6D";

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
  borderBottom: `1px solid rgba(31,27,71,0.4)`,
  verticalAlign: "middle",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

export default async function AdminUsersPage(): Promise<React.ReactElement> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      level: true,
      xpTotal: true,
      streakDays: true,
      createdAt: true,
      lastActiveAt: true,
      _count: {
        select: {
          badges: true,
          certificates: { where: { revokedAt: null } },
        },
      },
    },
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const studentCount = users.filter((u) => u.role === "STUDENT").length;

  function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }

  function relativeDate(d: Date): string {
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return "hier";
    if (diffDays < 7) return `il y a ${String(diffDays)} j`;
    return formatDate(d);
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
          Admin / Utilisateurs
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
          Utilisateurs ({String(users.length)})
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            margin: "6px 0 0",
          }}
        >
          {String(adminCount)} admin{adminCount !== 1 ? "s" : ""} · {String(studentCount)} étudiant
          {studentCount !== 1 ? "s" : ""}
        </p>
      </div>

      {users.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            border: `1px dashed ${BORDER}`,
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
            // aucun utilisateur enregistré
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
                <th style={{ ...thStyle, textAlign: "left" }}>Utilisateur</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Email</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Rôle</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Niveau</th>
                <th style={{ ...thStyle, textAlign: "right" }}>XP</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Streak</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Badges</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Certifs</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Inscrit</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actif</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isAdmin = u.role === "ADMIN";
                const handle = u.username
                  ? `@${u.username}`
                  : (u.displayName ?? u.email.split("@")[0] ?? "—");
                const initials = handle.replace("@", "").slice(0, 2).toUpperCase();

                return (
                  <tr key={u.id}>
                    <td style={tdStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            background: isAdmin
                              ? `linear-gradient(135deg, ${DANGER}, #8B1A2E)`
                              : "#2A2560",
                            display: "grid",
                            placeItems: "center",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: 10,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </span>
                        <span style={{ fontWeight: 600, color: "#F5F5FA", fontSize: 12 }}>
                          {handle}
                        </span>
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#6B6890", fontSize: 11 }}>{u.email}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {isAdmin ? (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: 9,
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
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: 9,
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
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#0AFFD4" }}>
                        <span style={{ color: "#44406B", fontWeight: 400 }}>LVL·</span>
                        {String(u.level).padStart(2, "0")}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#B8B5D1" }}>
                        {u.xpTotal.toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ color: "#FFB020" }}>
                        {String(u.streakDays)}
                        <span style={{ color: "#44406B" }}> j</span>
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{String(u._count.badges)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {String(u._count.certificates)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#44406B", fontSize: 11 }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontSize: 11 }}>
                      <span
                        style={{
                          color:
                            Date.now() - u.lastActiveAt.getTime() < 7 * 86_400_000
                              ? "#0AFFD4"
                              : "#44406B",
                        }}
                      >
                        {relativeDate(u.lastActiveAt)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <RoleToggleButton userId={u.id} currentRole={u.role} />
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
