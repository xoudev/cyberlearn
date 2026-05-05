import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { DeletePathButton } from "./_components/delete-path-button";

export const metadata: Metadata = { title: "Parcours" };

interface DiffColor {
  color: string;
  bg: string;
}
interface StatColor {
  color: string;
  label: string;
}

const DIFF_DEFAULT: DiffColor = { color: "#6B6890", bg: "rgba(42,37,96,0.3)" };
const STATUS_DEFAULT: StatColor = { color: "#6B6890", label: "Inconnu" };

const DIFF_COLORS: Record<string, DiffColor> = {
  BEGINNER: { color: "#0AFFD4", bg: "rgba(10,255,212,0.1)" },
  INTERMEDIATE: { color: "#4D8BFF", bg: "rgba(77,139,255,0.1)" },
  ADVANCED: { color: "#B14DFF", bg: "rgba(177,77,255,0.1)" },
  EXPERT: { color: "#FFB020", bg: "rgba(255,176,32,0.1)" },
};

const STATUS_COLORS: Record<string, StatColor> = {
  DRAFT: { color: "#6B6890", label: "Brouillon" },
  PUBLISHED: { color: "#0AFFD4", label: "Publié" },
  ARCHIVED: { color: "#FF4757", label: "Archivé" },
};

const CAT_LABEL: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

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
  padding: "14px 16px",
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: "middle",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

export default async function AdminPathsPage(): Promise<React.ReactElement> {
  const paths = await prisma.path.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      status: true,
      estimatedHours: true,
      avgRating: true,
      ratingsCount: true,
      createdAt: true,
      _count: {
        select: {
          lessons: true,
          progress: { where: { status: "COMPLETED" } },
          certificates: { where: { revokedAt: null } },
        },
      },
    },
  });

  const publishedCount = paths.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = paths.filter((p) => p.status === "DRAFT").length;

  return (
    <div className="admin-page-content">
      <style>{`.edit-path-btn:hover{color:#4D8BFF!important;border-color:rgba(77,139,255,0.3)!important;background:rgba(77,139,255,0.06)!important}`}</style>
      {/* Header */}
      <div className="admin-page-header">
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
            Admin / Parcours
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
            Parcours ({String(paths.length)})
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              margin: "6px 0 0",
            }}
          >
            {String(publishedCount)} publiés · {String(draftCount)} brouillons
          </p>
        </div>

        <Link
          href="/paths/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "#0024FF",
            border: "1px solid #0024FF",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Nouveau parcours
        </Link>
      </div>

      {paths.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            border: `1px dashed ${BORDER}`,
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
            {"// aucun parcours pour l'instant"}
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
                <th style={{ ...thStyle, textAlign: "left" }}>Ref</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Titre</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Catégorie</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Difficulté</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Leçons</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Complétions</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Certifs</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Note</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Statut</th>
                <th style={{ ...thStyle, width: 72 }} />
              </tr>
            </thead>
            <tbody>
              {paths.map((p) => {
                const diff = DIFF_COLORS[p.difficulty] ?? DIFF_DEFAULT;
                const status = STATUS_COLORS[p.status] ?? STATUS_DEFAULT;
                const cat = CAT_LABEL[p.category] ?? p.category;

                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid rgba(31,27,71,0.4)` }}>
                    <td style={tdStyle}>
                      <span style={{ color: "#44406B", letterSpacing: "0.04em" }}>{p.refCode}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 280 }}>
                      <Link href={`/paths/${p.id}/edit`} style={{ textDecoration: "none" }}>
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
                          {p.title}
                        </div>
                        <div style={{ fontSize: 10, color: "#44406B" }}>{p.slug}</div>
                      </Link>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#6B6890",
                        }}
                      >
                        {cat}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 10px",
                          background: diff.bg,
                          border: `1px solid ${diff.color}30`,
                          color: diff.color,
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {p.difficulty}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#B8B5D1" }}>
                        {String(p._count.lessons)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#0AFFD4" }}>
                        {String(p._count.progress)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#B8B5D1" }}>
                        {String(p._count.certificates)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {p.avgRating != null ? (
                        <span style={{ color: "#FFB020", fontWeight: 700 }}>
                          {p.avgRating.toFixed(1)}
                          <span style={{ color: "#44406B", fontWeight: 400 }}>
                            {" "}
                            ({String(p.ratingsCount)})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#44406B" }}>-</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: status.color,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: status.color,
                            flexShrink: 0,
                          }}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, width: 72, padding: "14px 8px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 4,
                        }}
                      >
                        <Link
                          href={`/paths/${p.id}/edit`}
                          title="Modifier le parcours"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            border: "1px solid transparent",
                            borderRadius: 4,
                            color: "#44406B",
                            transition: "all 120ms ease",
                            flexShrink: 0,
                            textDecoration: "none",
                          }}
                          className="edit-path-btn"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9.5 2.5 L11.5 4.5 L4.5 11.5 L2 12 L2.5 9.5 Z" />
                            <path d="M8 4 L10 6" />
                          </svg>
                        </Link>
                        <DeletePathButton
                          pathId={p.id}
                          pathTitle={p.title}
                          disabled={p.status === "PUBLISHED"}
                          disabledReason="Archivez le parcours avant de le supprimer"
                        />
                      </div>
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
