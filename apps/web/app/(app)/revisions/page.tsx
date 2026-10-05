import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { reviewRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { PageHeader } from "@/components/page-header";
import {
  REVIEW_SESSION_SIZE,
  reviewDueLabel,
  reviewMinutes,
  reviewXpFor,
  waitingText,
} from "@cyberlearn/lib";
import { RevisionsList, type ReviewRow } from "./_components/revisions-list";
import { Crumb } from "@/components/crumb";
import { categoryMeta } from "@cyberlearn/lib/content/vocabulary";

export const metadata: Metadata = { title: "Révisions" };
export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeEst(difficulty: string): string {
  return `${String(reviewMinutes(difficulty))} min`;
}

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
          <Link href="/settings/preferences" className="btn btn--sm">
            Rouvrir les préférences
          </Link>
        </p>
      </div>
    );
  }

  // The day's session, not the whole queue: five at most, the longest overdue
  // first, of the lessons still published. What waits is said in one line.
  const [session, upcomingSchedules] = await Promise.all([
    reviewRepository.findSession(authUser.id, now),
    reviewRepository.findUpcoming(authUser.id, now, 10),
  ]);
  const dueSchedules = session.rows;
  const waiting = waitingText(session.waiting);

  const totalMinutes = dueSchedules.reduce((sum, s) => sum + reviewMinutes(s.lesson.difficulty), 0);
  const isEmpty = dueSchedules.length === 0;
  const count = dueSchedules.length;

  const rows: ReviewRow[] = dueSchedules.map((s) => {
    const due = reviewDueLabel(s.nextReviewAt, now);
    const cat = categoryMeta(s.lesson.category);
    return {
      scheduleId: s.id,
      title: s.lesson.title,
      slug: s.lesson.slug,
      catLabel: cat.short,
      catColor: cat.color,
      catBorder: `color-mix(in srgb, ${cat.color} 35%, transparent)`,
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
        .rv-row:hover .rv-go{color:var(--color-text-primary)!important}
        .rv-row:hover .rv-go svg stroke{stroke:var(--color-text-primary)!important}
      `}</style>

      <div className="page-container">
        {/* Breadcrumb */}
        <Crumb segments={["révisions"]} />

        {/* Eyebrow */}
        <div
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
            marginBottom: 14,
          }}
        >
          <span style={{ color: "var(--color-text-faint)" }}>{"// "}</span>
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
            color: "var(--color-text-primary)",
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
                  background:
                    "linear-gradient(180deg, var(--cosmetic-accent), var(--color-brand-blue))",
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
                  background:
                    "linear-gradient(180deg, var(--color-rarity-legendary), var(--color-category-cybersec))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {count} révision{count > 1 ? "s" : ""}
              </em>{" "}
              pour aujourd&apos;hui.
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--color-text-secondary)",
            maxWidth: 620,
            margin: "0 0 44px",
          }}
        >
          {isEmpty
            ? "Tes révisions sont à jour. Reviens demain pour continuer à consolider tes connaissances selon la courbe d'oubli."
            : "Ta session du jour, les leçons en retard depuis le plus longtemps d'abord. Chaque révision consolide ce que tu as appris, et une leçon retenue assez de fois sort du cycle."}
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
                  color: "var(--color-text-secondary)",
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
                className="btn btn--lg"
                style={{
                  position: "relative",
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
                className="back-link mono-label"
                style={{
                  color: "var(--color-text-muted)",
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
              <div className="card" style={{ overflow: "hidden" }}>
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
                    color: "var(--color-text-faint)",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span>
                    Courbe d&apos;oubli · algorithme SM-2 · {REVIEW_SESSION_SIZE} par jour au plus
                  </span>
                  <span>
                    Total ·{" "}
                    <b style={{ color: "var(--color-text-secondary)" }}>
                      ~{String(totalMinutes)} minutes
                    </b>
                  </span>
                </div>
              </div>
            </section>

            {waiting !== null && (
              <p
                style={{
                  margin: "14px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--color-text-muted)",
                }}
              >
                {waiting}
              </p>
            )}

            {/* CTA: grading happens in place now, only the back link remains */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
              <Link
                href="/dashboard"
                className="back-link mono-label"
                style={{
                  color: "var(--color-text-muted)",
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
        className="mono-label"
        style={{
          color: "var(--color-text-muted)",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "var(--color-text-faint)" }}>{"// "}</span>PROCHAINES RÉVISIONS
      </div>
      <div className="card card--ghost" style={{ overflow: "hidden" }}>
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
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                }}
              >
                {s.lesson.title}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-text-faint)",
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
