import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { PageHeader } from "@/components/page-header";
import { reviewDueLabel, reviewMinutes, reviewXpFor } from "@cyberlearn/lib";
import { RevisionsList, type ReviewRow } from "./_components/revisions-list";

export const metadata: Metadata = { title: "Révisions · CyberLearn" };
export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeEst(difficulty: string): string {
  return `${String(reviewMinutes(difficulty))} min`;
}

const CAT_LABELS: Record<string, { label: string; color: string; border: string }> = {
  CYBERSEC: { label: "Cybersec", color: "#FF6B9D", border: "rgba(255,107,157,0.35)" },
  DEV: { label: "Développement", color: "#0AFFD4", border: "rgba(10,255,212,0.35)" },
  NETWORK: { label: "Réseaux", color: "#6E8BFF", border: "rgba(110,139,255,0.35)" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default async function RevisionsPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const now = new Date();

  // Switched off, but still reachable: a bookmark or an old link should explain
  // itself and offer the way back rather than 404 at someone who once used this
  // every day. Their schedules are still there, waiting.
  if (!(await revisionsEnabled(authUser.id))) {
    return (
      <div className="page-container">
        <PageHeader
          crumb="revisions"
          eyebrow="RÉVISIONS · DÉSACTIVÉES"
          title="Les révisions sont coupées"
          lede="Tu as désactivé la répétition espacée dans tes préférences. Rien n'est perdu : ce que tu avais à réviser t'attend si tu la réactives."
        />
        <p>
          <Link href="/settings/preferences" className="cls-btn cls-btn--link">
            Rouvrir les préférences
          </Link>
        </p>
      </div>
    );
  }

  const [dueSchedules, upcomingSchedules] = await Promise.all([
    prisma.reviewSchedule.findMany({
      where: { userId: authUser.id, nextReviewAt: { lte: now } },
      orderBy: { nextReviewAt: "asc" },
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
            difficulty: true,
            xpReward: true,
          },
        },
      },
    }),
    prisma.reviewSchedule.findMany({
      where: { userId: authUser.id, nextReviewAt: { gt: now } },
      orderBy: { nextReviewAt: "asc" },
      take: 10,
      include: { lesson: { select: { title: true, difficulty: true } } },
    }),
  ]);

  const totalMinutes = dueSchedules.reduce((sum, s) => sum + reviewMinutes(s.lesson.difficulty), 0);
  const isEmpty = dueSchedules.length === 0;
  const count = dueSchedules.length;

  const rows: ReviewRow[] = dueSchedules.map((s) => {
    const due = reviewDueLabel(s.nextReviewAt, now);
    const cat = CAT_LABELS[s.lesson.category] ?? {
      label: s.lesson.category,
      color: "#6B6890",
      border: "rgba(107,104,144,0.35)",
    };
    return {
      scheduleId: s.id,
      title: s.lesson.title,
      slug: s.lesson.slug,
      catLabel: cat.label,
      catColor: cat.color,
      catBorder: cat.border,
      dueText: due.text,
      dueToday: due.kind === "today",
      est: timeEst(s.lesson.difficulty),
      reviewXp: reviewXpFor(s.lesson.xpReward),
    };
  });

  return (
    <>
      <style>{`
        @keyframes rv-blink { 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
        @keyframes rv-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @media (prefers-reduced-motion:reduce){.rv-caret,.rv-typed::after{animation:none!important}}
        .rv-row:hover{background:rgba(255,255,255,0.025)!important}
        .rv-row:hover .rv-go{color:#F5F5FA!important}
        .rv-row:hover .rv-go svg stroke{stroke:#F5F5FA!important}
      `}</style>

      <div className="page-container">
        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#6B6890",
            marginBottom: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--cosmetic-accent)" }}>$</span>
          <span>~/</span>
          <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
          <span style={{ color: "#44406B" }}>/</span>
          <span style={{ color: "#F5F5FA", fontWeight: 500 }}>révisions</span>
          <span
            className="rv-caret"
            style={{
              display: "inline-block",
              width: 7,
              height: 13,
              background: "var(--cosmetic-accent)",
              boxShadow: "0 0 8px var(--cosmetic-accent)",
              marginLeft: 4,
              verticalAlign: -2,
              animation: "rv-blink 1s step-end infinite",
            }}
          />
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
            marginBottom: 14,
          }}
        >
          <span style={{ color: "#44406B" }}>{"// "}</span>
          SESSION · <b style={{ color: "var(--cosmetic-accent)", fontWeight: 500 }}>SM-2</b> ·
          COURBE D&apos;OUBLI
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: "clamp(40px, 5.5vw, 72px)",
            lineHeight: 1.1,
            letterSpacing: "-0.035em",
            color: "#F5F5FA",
            margin: "0 0 24px",
            maxWidth: 920,
          }}
        >
          {isEmpty ? (
            <>
              Tout est{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(180deg, var(--cosmetic-accent), #0024FF)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                à jour
              </em>
              .
            </>
          ) : (
            <>
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(180deg, #FFB547, #FF4757)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {count} révision{count > 1 ? "s" : ""}
              </em>{" "}
              en attente.
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "#B8B5D1",
            maxWidth: 620,
            margin: "0 0 44px",
          }}
        >
          {isEmpty
            ? "Tes révisions sont à jour. Reviens demain pour continuer à consolider tes connaissances selon la courbe d'oubli."
            : "Tes prochaines micro-révisions, ordonnées par échéance. Chaque session consolide ce que tu as appris cette semaine."}
        </p>

        {/* Empty state */}
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <div
              style={{
                padding: "60px 40px",
                textAlign: "center",
                border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 20%, transparent)",
                background: "color-mix(in srgb, var(--cosmetic-accent) 3%, transparent)",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 48,
                  fontWeight: 800,
                  color: "var(--cosmetic-accent)",
                  marginBottom: 16,
                  filter:
                    "drop-shadow(0 0 20px color-mix(in srgb, var(--cosmetic-accent) 40%, transparent))",
                }}
              >
                ✓
              </div>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  color: "#B8B5D1",
                  margin: 0,
                }}
              >
                Prochain batch de révisions dans quelques heures.
              </p>
            </div>

            {/* Upcoming even when empty */}
            {upcomingSchedules.length > 0 && (
              <UpcomingSection schedules={upcomingSchedules} now={now} />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Link
                href="/lessons"
                className="btn-blue"
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 32px",
                  background: "#0024FF",
                  color: "#fff",
                  border: "1px solid #0024FF",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  boxShadow: "0 0 20px rgba(0,36,255,0.45)",
                }}
              >
                Faire une leçon{" "}
                <span
                  style={{
                    color: "var(--cosmetic-accent)",
                    textShadow:
                      "0 0 8px color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)",
                  }}
                >
                  →
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="back-link"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  textDecoration: "none",
                  padding: "16px 8px",
                }}
              >
                ← Retour au dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Review list */}
            <section style={{ marginBottom: 0 }}>
              <div
                style={{ border: "1px solid #2A2560", background: "#0A0826", overflow: "hidden" }}
              >
                <RevisionsList rows={rows} />

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 24px",
                    borderTop: "1px solid rgba(31,27,71,0.6)",
                    background: "#050416",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "#44406B",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span>Révisions basées sur ta courbe d&apos;oubli · algorithme SM-2</span>
                  <span>
                    Total · <b style={{ color: "#B8B5D1" }}>~{String(totalMinutes)} minutes</b>
                  </span>
                </div>
              </div>
            </section>

            {/* CTA: grading happens in place now, only the back link remains */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
              <Link
                href="/dashboard"
                className="back-link"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  textDecoration: "none",
                  padding: "16px 8px",
                }}
              >
                ← Retour au dashboard
              </Link>
            </div>

            {/* Upcoming */}
            {upcomingSchedules.length > 0 && (
              <div style={{ marginTop: 56 }}>
                <UpcomingSection schedules={upcomingSchedules} now={now} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Upcoming list ─────────────────────────────────────────────────────────────

interface Schedule {
  id: string;
  nextReviewAt: Date;
  lesson: { title: string; difficulty: string };
}

function UpcomingSection({ schedules, now }: { schedules: Schedule[]; now: Date }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#6B6890",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "#44406B" }}>{"// "}</span>PROCHAINES RÉVISIONS
      </div>
      <div style={{ border: "1px solid #2A2560", overflow: "hidden" }}>
        {schedules.map((s, i) => {
          const daysUntil = Math.ceil((s.nextReviewAt.getTime() - now.getTime()) / 86_400_000);
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 18px",
                borderBottom: i < schedules.length - 1 ? "1px solid rgba(31,27,71,0.5)" : "none",
                background: "rgba(5,4,26,0.4)",
              }}
            >
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#B8B5D1" }}>
                {s.lesson.title}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#44406B",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.08em",
                }}
              >
                dans {String(daysUntil)} jour{daysUntil > 1 ? "s" : ""} ·{" "}
                {timeEst(s.lesson.difficulty)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
