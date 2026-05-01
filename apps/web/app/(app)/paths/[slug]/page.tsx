import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@cyberlearn/lib";
import { prisma } from "@cyberlearn/db";

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = await prisma.path.findUnique({ where: { slug }, select: { title: true } });
  return { title: path?.title ?? "Parcours" };
}

// ── Design helpers ─────────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; color: string; tagClass: string }> = {
  CYBERSEC: { label: "Cybersec", color: "#FF4757", tagClass: "cyber" },
  DEV: { label: "Dev", color: "#6E8BFF", tagClass: "dev" },
  NETWORK: { label: "Réseau", color: "#0AFFD4", tagClass: "net" },
};

const DIFF_META: Record<
  string,
  { label: string; level: number; color: string; abbr: "beg" | "int" | "adv" }
> = {
  BEGINNER: { label: "Débutant", level: 1, color: "#0AFFD4", abbr: "beg" },
  INTERMEDIATE: { label: "Intermédiaire", level: 2, color: "#6E8BFF", abbr: "int" },
  ADVANCED: { label: "Avancé", level: 3, color: "#FF4757", abbr: "adv" },
};

const CAT_DEFAULT = { label: "?", color: "#B8B5D1", tagClass: "cyber" };
const DIFF_DEFAULT = { label: "?", level: 1, color: "#B8B5D1", abbr: "beg" as const };

const CORNER_STYLE = (pos: "tl" | "tr" | "bl" | "br"): React.CSSProperties => ({
  position: "absolute",
  width: 14,
  height: 14,
  borderColor: "#0AFFD4",
  borderStyle: "solid",
  borderWidth: 0,
  top: pos.startsWith("t") ? -1 : undefined,
  bottom: pos.startsWith("b") ? -1 : undefined,
  left: pos.endsWith("l") ? -1 : undefined,
  right: pos.endsWith("r") ? -1 : undefined,
  borderTopWidth: pos.startsWith("t") ? 2 : 0,
  borderBottomWidth: pos.startsWith("b") ? 2 : 0,
  borderLeftWidth: pos.endsWith("l") ? 2 : 0,
  borderRightWidth: pos.endsWith("r") ? 2 : 0,
});

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PathDetailPage({
  params,
}: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const authUser = await requireUser(supabase);

  const path = await prisma.path.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      lessons: {
        orderBy: { position: "asc" },
        include: {
          lesson: {
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              difficulty: true,
              estimatedMinutes: true,
              xpReward: true,
            },
          },
        },
      },
    },
  });

  if (!path) notFound();

  const cat = CAT_META[path.category] ?? CAT_DEFAULT;
  const diff = DIFF_META[path.difficulty] ?? DIFF_DEFAULT;

  // Fetch user's completed lessons for this path
  const completedLessonIds = new Set(
    (
      await prisma.userLessonProgress.findMany({
        where: {
          userId: authUser.id,
          status: "COMPLETED",
          lesson: { pathLessons: { some: { pathId: path.id } } },
        },
        select: { lessonId: true },
      })
    ).map((lp) => lp.lessonId),
  );

  const userPathProgress = await prisma.userPathProgress.upsert({
    where: { userId_pathId: { userId: authUser.id, pathId: path.id } },
    create: { userId: authUser.id, pathId: path.id, status: "IN_PROGRESS" },
    update: {},
    select: { status: true, certificateId: true },
  });

  const xpTotal = path.lessons.reduce((sum, pl) => sum + pl.lesson.xpReward, 0);
  const doneLessons = completedLessonIds.size;
  const totalLessons = path.lessons.length;
  const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  // Sequential unlock: lesson is unlocked if all previous are completed (or first)
  type NodeState = "completed" | "unlocked" | "locked";
  const nodeStates: NodeState[] = path.lessons.map((pl, i) => {
    if (completedLessonIds.has(pl.lessonId)) return "completed";
    const prevCompleted = i === 0 || completedLessonIds.has(path.lessons[i - 1]?.lessonId ?? "");
    return prevCompleted ? "unlocked" : "locked";
  });

  // Group lessons into modules (every 6 lessons)
  const MODULE_SIZE = 6;
  const modules: { label: string; start: number; end: number }[] = [];
  for (let i = 0; i < totalLessons; i += MODULE_SIZE) {
    const moduleNum = modules.length + 1;
    modules.push({
      label: `Module ${String(moduleNum).padStart(2, "0")}`,
      start: i,
      end: Math.min(i + MODULE_SIZE, totalLessons),
    });
  }

  const pathStatus = userPathProgress.status;

  return (
    <div className="path-page">
      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#6B6890",
          marginBottom: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#44406B" }}>/</span>
        <Link
          href="/paths"
          className="breadcrumb-link"
          style={{ color: "#B8B5D1", textDecoration: "none", fontWeight: 500 }}
        >
          parcours
        </Link>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>{slug}</span>
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "#0AFFD4",
            boxShadow: "0 0 8px #0AFFD4",
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
        />
      </div>

      {/* Hero */}
      <section className="path-hero-grid">
        {/* Left: title + desc */}
        <div>
          {/* Tags */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: cat.color,
                background: `${cat.color}14`,
                border: `1px solid ${cat.color}73`,
                clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
              }}
            >
              {cat.label}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: diff.color,
                background: `${diff.color}14`,
                border: `1px solid ${diff.color}66`,
                clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
              }}
            >
              {/* Diff bars */}
              <span style={{ display: "inline-flex", gap: 2 }}>
                {([1, 2, 3] as const).map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 3,
                      height: 8,
                      background: i <= diff.level ? "currentColor" : "#3F3D5C",
                    }}
                  />
                ))}
              </span>
              {diff.label}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(44px, 5.6vw, 80px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              color: "#F5F5FA",
              margin: "0 0 20px",
            }}
          >
            {path.title}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "#B8B5D1",
              margin: 0,
              maxWidth: 600,
            }}
          >
            {path.description}
          </p>
        </div>

        {/* Right: stats panel */}
        <div
          style={{
            position: "relative",
            background: "rgba(5,4,26,0.6)",
            border: "1px solid #1F1B47",
            padding: "24px 24px 0",
          }}
        >
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <span key={pos} aria-hidden="true" style={CORNER_STYLE(pos)} />
          ))}

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#0AFFD4",
              marginBottom: 18,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{ width: 18, height: 1, background: "#0AFFD4", display: "inline-block" }}
            />
            MISSION.BRIEF
          </div>

          {/* Stats 2×2 grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 1,
              background: "#1F1B47",
              margin: "0 -24px",
              borderTop: "1px solid #1F1B47",
            }}
          >
            {[
              { label: "Missions", value: String(totalLessons), unit: "", xp: false, cert: false },
              {
                label: "Durée estimée",
                value: `~${String(path.estimatedHours)}`,
                unit: "h",
                xp: false,
                cert: false,
              },
              {
                label: "XP total",
                value: xpTotal.toLocaleString("fr-FR"),
                unit: "",
                xp: true,
                cert: false,
              },
              {
                label: "Certificat",
                value: "",
                unit: "",
                xp: false,
                cert: path.certificateTemplate !== null,
              },
            ].map(({ label, value, unit, xp, cert }) => (
              <div key={label} style={{ background: "rgba(5,4,26,0.6)", padding: "16px 20px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#6B6890",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                {cert ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "#0AFFD4",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ filter: "drop-shadow(0 0 6px #0AFFD4)" }}
                    >
                      <circle cx="10" cy="8" r="4" />
                      <path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5" />
                    </svg>
                    <span>
                      Certificat
                      <br />
                      inclus
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 800,
                      fontSize: 28,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      ...(xp
                        ? {
                            background: "linear-gradient(180deg, #F5F5FA, #0AFFD4)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }
                        : {
                            color: "#F5F5FA",
                          }),
                    }}
                  >
                    {value}
                    {unit && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          color: "#6B6890",
                          fontWeight: 600,
                        }}
                      >
                        {unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={path.lessons[0] ? `/lessons/${path.lessons[0].lesson.slug}` : "#"}
            style={{
              marginTop: 18,
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "16px 22px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: "#0024FF",
              color: "#fff",
              border: "1px solid #0024FF",
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(0,36,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {pathStatus === "IN_PROGRESS"
              ? "Continuer le parcours"
              : pathStatus === "COMPLETED"
                ? "Revoir le parcours"
                : "Commencer le parcours"}
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8 H13 M9 4 L13 8 L9 12" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 56 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6B6890",
            whiteSpace: "nowrap",
          }}
        >
          <b style={{ color: "#0AFFD4" }}>{pct}%</b> complété
        </span>
        <div
          style={{
            position: "relative",
            flex: 1,
            height: 4,
            background: "#05041A",
            border: "1px solid #1F1B47",
            overflow: "visible",
          }}
        >
          {pct > 0 && (
            <div
              style={{
                height: "100%",
                width: `${String(pct)}%`,
                background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
                boxShadow: "0 0 12px rgba(10,255,212,0.55)",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  right: -1,
                  top: -3,
                  bottom: -3,
                  width: 2,
                  background: "#0AFFD4",
                  boxShadow: "0 0 10px #0AFFD4",
                  display: "block",
                }}
              />
            </div>
          )}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          <b style={{ color: "#F5F5FA" }}>{doneLessons}</b> / {totalLessons} missions
        </span>
      </div>

      {/* Body: tree + aside */}
      <div className="path-body-grid">
        {/* Skill tree */}
        <div style={{ position: "relative" }}>
          {modules.map((mod, modIdx) => (
            <React.Fragment key={modIdx}>
              {/* Module header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  margin: `${String(modIdx === 0 ? 0 : 32)}px 0 22px`,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#0AFFD4",
                }}
              >
                <span
                  style={{
                    flex: "0 0 auto",
                    maxWidth: 60,
                    height: 1,
                    background: "linear-gradient(90deg, transparent, #0AFFD4)",
                  }}
                />
                {mod.label}
                <span
                  style={{
                    flex: 1,
                    height: 1,
                    background: "linear-gradient(90deg, #0AFFD4, transparent)",
                  }}
                />
              </div>

              {/* Node list */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: 36,
                }}
              >
                {/* Vertical connector */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 8,
                    bottom: 8,
                    width: 1,
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, #2A2560 0, #2A2560 4px, transparent 4px, transparent 8px)",
                  }}
                />

                {path.lessons.slice(mod.start, mod.end).map((pl, localIdx) => {
                  const globalIdx = mod.start + localIdx;
                  const nodeState = nodeStates[globalIdx] ?? "locked";
                  const lesson = pl.lesson;
                  const lessonDiff = DIFF_META[lesson.difficulty] ?? DIFF_DEFAULT;
                  const num = String(globalIdx + 1).padStart(2, "0");

                  return (
                    <div key={pl.lessonId} style={{ position: "relative", padding: "14px 0" }}>
                      {/* Node dot */}
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: -28,
                          top: 28,
                          width: 14,
                          height: 14,
                          background: nodeState === "completed" ? "#0AFFD4" : "#030219",
                          border: `1px solid ${nodeState === "locked" ? "#2A2560" : "#0AFFD4"}`,
                          boxShadow:
                            nodeState !== "locked" ? "0 0 10px rgba(10,255,212,0.55)" : "none",
                          display: "grid",
                          placeItems: "center",
                          zIndex: 1,
                        }}
                      >
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            background:
                              nodeState === "completed"
                                ? "#030219"
                                : nodeState === "unlocked"
                                  ? "#0AFFD4"
                                  : "#3F3D5C",
                            transform: "rotate(45deg)",
                            display: "block",
                          }}
                        />
                      </span>

                      {/* Card */}
                      {nodeState !== "locked" ? (
                        <Link
                          href={`/lessons/${lesson.slug}`}
                          className="lesson-node-link"
                          style={{
                            position: "relative",
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 18,
                            alignItems: "center",
                            padding: "18px 22px",
                            background:
                              nodeState === "completed"
                                ? "linear-gradient(135deg, rgba(10,255,212,0.12), rgba(10,255,212,0.04) 60%)"
                                : "rgba(10,8,38,0.5)",
                            border: `1px solid ${nodeState === "completed" ? "rgba(10,255,212,0.5)" : "rgba(10,255,212,0.4)"}`,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <div style={{ paddingTop: 14, minWidth: 0 }}>
                            <div
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 16,
                                fontFamily: "var(--font-mono)",
                                fontSize: 9.5,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                color: "#6B6890",
                              }}
                            >
                              MISSION · <b style={{ color: "#0AFFD4" }}>{num}</b>
                            </div>
                            <h3
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontWeight: 700,
                                fontSize: 18,
                                lineHeight: 1.2,
                                letterSpacing: "-0.01em",
                                color: "#F5F5FA",
                                margin: "0 0 8px",
                              }}
                            >
                              {lesson.title}
                            </h3>
                            <div
                              style={{
                                display: "flex",
                                gap: 14,
                                flexWrap: "wrap",
                                alignItems: "center",
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                letterSpacing: "0.06em",
                                color: "#6B6890",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "2px 7px",
                                  border: `1px solid ${lessonDiff.color}59`,
                                  color: lessonDiff.color,
                                  fontWeight: 700,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                  fontSize: 9.5,
                                }}
                              >
                                {lessonDiff.label}
                              </span>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  color: "#0AFFD4",
                                  fontWeight: 700,
                                  letterSpacing: "0.1em",
                                }}
                              >
                                <span
                                  style={{
                                    width: 5,
                                    height: 5,
                                    transform: "rotate(45deg)",
                                    background: "#0AFFD4",
                                    boxShadow: "0 0 6px #0AFFD4",
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
                                />
                                +{lesson.xpReward} XP
                              </span>
                              <span style={{ color: "#44406B" }}>/</span>
                              <span>{lesson.estimatedMinutes} min</span>
                            </div>
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              fontSize: 11,
                              letterSpacing: "0.16em",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                              paddingTop: 14,
                              color: "#0AFFD4",
                            }}
                          >
                            {nodeState === "completed" ? (
                              <span
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                              >
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    background: "#0AFFD4",
                                    clipPath:
                                      "polygon(20% 50%, 45% 75%, 80% 25%, 80% 35%, 45% 85%, 20% 60%)",
                                    display: "inline-block",
                                  }}
                                />
                                Revoir
                              </span>
                            ) : (
                              "Accéder →"
                            )}
                          </div>
                          {nodeState === "completed" && (
                            <span
                              aria-hidden="true"
                              style={{
                                position: "absolute",
                                top: 12,
                                right: 14,
                                width: 22,
                                height: 22,
                                display: "grid",
                                placeItems: "center",
                                background: "#0AFFD4",
                                color: "#030219",
                                boxShadow: "0 0 14px rgba(10,255,212,0.55)",
                                clipPath:
                                  "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                              }}
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 8 L7 12 L13 4" />
                              </svg>
                            </span>
                          )}
                        </Link>
                      ) : (
                        <div
                          style={{
                            position: "relative",
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 18,
                            alignItems: "center",
                            padding: "18px 22px",
                            background: "rgba(7,5,32,0.4)",
                            border: "1px solid #1A1640",
                            opacity: 0.55,
                          }}
                        >
                          <div style={{ paddingTop: 14, minWidth: 0 }}>
                            <div
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 16,
                                fontFamily: "var(--font-mono)",
                                fontSize: 9.5,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                color: "#44406B",
                              }}
                            >
                              MISSION · <b style={{ color: "#44406B" }}>{num}</b>
                            </div>
                            <h3
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontWeight: 700,
                                fontSize: 18,
                                lineHeight: 1.2,
                                letterSpacing: "-0.01em",
                                color: "#B8B5D1",
                                margin: "0 0 8px",
                              }}
                            >
                              {lesson.title}
                            </h3>
                            <div
                              style={{
                                display: "flex",
                                gap: 14,
                                flexWrap: "wrap",
                                alignItems: "center",
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                letterSpacing: "0.06em",
                                color: "#44406B",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "2px 7px",
                                  border: "1px solid #2A2560",
                                  color: "#6B6890",
                                  fontWeight: 700,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                  fontSize: 9.5,
                                }}
                              >
                                {lessonDiff.label}
                              </span>
                              <span>+{lesson.xpReward} XP</span>
                              <span>/</span>
                              <span>{lesson.estimatedMinutes} min</span>
                            </div>
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 500,
                              fontSize: 10,
                              letterSpacing: "0.1em",
                              whiteSpace: "nowrap",
                              paddingTop: 14,
                              color: "#44406B",
                              maxWidth: 180,
                              textAlign: "right",
                            }}
                          >
                            Complète la mission précédente
                          </div>
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 14,
                              width: 22,
                              height: 22,
                              display: "grid",
                              placeItems: "center",
                              border: "1px solid #2A2560",
                              background: "#05041A",
                              color: "#6B6890",
                            }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="7" width="10" height="7" rx="1" />
                              <path d="M5 7 V5 C5 3.3 6.3 2 8 2 C9.7 2 11 3.3 11 5 V7" />
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Aside */}
        <aside className="path-aside-sticky">
          {/* Objectives */}
          <div
            style={{
              position: "relative",
              padding: "22px 22px 24px",
              background: "rgba(5,4,26,0.55)",
              border: "1px solid #1F1B47",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{ width: 14, height: 1, background: "#0AFFD4", display: "inline-block" }}
              />
              01 · OBJECTIFS
            </div>
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.01em",
                color: "#F5F5FA",
                margin: "0 0 14px",
              }}
            >
              Ce que tu vas maîtriser
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {path.lessons.slice(0, 6).map((pl) => (
                <li
                  key={pl.lessonId}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontFamily: "var(--font-sans)",
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    color: "#B8B5D1",
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      background: "#0AFFD4",
                      flexShrink: 0,
                      marginTop: 3,
                      clipPath: "polygon(20% 50%, 45% 75%, 85% 20%, 90% 30%, 45% 88%, 12% 58%)",
                      boxShadow: "0 0 6px rgba(10,255,212,0.45)",
                      display: "block",
                    }}
                  />
                  {pl.lesson.description}
                </li>
              ))}
            </ul>
          </div>

          {/* Certificate card */}
          {path.certificateTemplate && (
            <div
              style={{
                position: "relative",
                background: userPathProgress.certificateId
                  ? "linear-gradient(135deg, rgba(10,255,212,0.06), transparent 60%), rgba(5,4,26,0.7)"
                  : "linear-gradient(135deg, rgba(0,36,255,0.08), transparent 60%), rgba(5,4,26,0.7)",
                border: `1px solid ${userPathProgress.certificateId ? "rgba(10,255,212,0.25)" : "#1F1B47"}`,
                padding: "22px",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 64px",
                gap: 18,
                alignItems: "end",
              }}
            >
              {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <span key={pos} aria-hidden="true" style={CORNER_STYLE(pos)} />
              ))}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#0AFFD4",
                    marginBottom: 10,
                  }}
                >
                  {userPathProgress.certificateId ? "// CERT · DÉBLOQUÉ" : "// CERT · À DÉBLOQUER"}
                </div>
                <h4
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                    color: "#F5F5FA",
                    margin: "0 0 10px",
                  }}
                >
                  {path.title}
                </h4>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#6B6890",
                    letterSpacing: "0.04em",
                    lineHeight: 1.55,
                  }}
                >
                  Vérifiable publiquement
                  <br />
                  Signé · <b style={{ color: "#B8B5D1" }}>SHA-256</b>
                </div>
                {userPathProgress.certificateId && (
                  <a
                    href={`/api/certificates/${userPathProgress.certificateId}/download`}
                    className="link-action"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 14,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#0AFFD4",
                      textDecoration: "none",
                    }}
                  >
                    Télécharger le PDF
                    <svg viewBox="0 0 14 14" width={10} height={10} fill="none">
                      <path
                        d="M7 2v7M4 6l3 3 3-3M2 11h10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                )}
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "#05041A",
                  border: "1px solid #1F1B47",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "#3F3D5C",
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                QR
                <br />
                CODE
              </div>
            </div>
          )}

          {/* Badges teaser */}
          <div
            style={{
              position: "relative",
              padding: "22px 22px 24px",
              background: "rgba(5,4,26,0.55)",
              border: "1px solid #1F1B47",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{ width: 14, height: 1, background: "#0AFFD4", display: "inline-block" }}
              />
              02 · BADGES
            </div>
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.01em",
                color: "#F5F5FA",
                margin: "0 0 14px",
              }}
            >
              Badges du parcours
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              {(["#FFB547", "#0AFFD4", "#6E8BFF"] as const).map((color) => (
                <div
                  key={color}
                  style={{
                    width: 44,
                    height: 50,
                    display: "grid",
                    placeItems: "center",
                    background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                    border: `1px solid ${color}55`,
                    clipPath: "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: color,
                      transform: "rotate(45deg)",
                      display: "block",
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                </div>
              ))}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "#6B6890",
                  letterSpacing: "0.06em",
                }}
              >
                <b
                  style={{
                    color: "#F5F5FA",
                    fontSize: 20,
                    display: "block",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {totalLessons}
                </b>
                badges à<br />
                débloquer
              </div>
            </div>
            <Link
              href="/badges"
              className="link-action"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#0AFFD4",
                textDecoration: "none",
              }}
            >
              Voir la collection →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
