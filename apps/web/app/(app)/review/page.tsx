import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { ReviewCard } from "./_components/ReviewCard";

export const metadata: Metadata = { title: "Révisions · CyberLearn" };

export default async function ReviewPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const now = new Date();

  const dueSchedules = await prisma.reviewSchedule.findMany({
    where: { userId: authUser.id, nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: "asc" },
    include: {
      lesson: {
        select: {
          id: true,
          slug: true,
          title: true,
          xpReward: true,
          category: true,
          difficulty: true,
        },
      },
    },
  });

  const upcomingSchedules = await prisma.reviewSchedule.findMany({
    where: { userId: authUser.id, nextReviewAt: { gt: now } },
    orderBy: { nextReviewAt: "asc" },
    take: 5,
    include: { lesson: { select: { title: true } } },
  });

  const totalScheduled = await prisma.reviewSchedule.count({
    where: { userId: authUser.id },
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 56px 120px" }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
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
            marginBottom: 10,
          }}
        >
          <span style={{ width: 16, height: 1, background: "#0AFFD4", display: "inline-block" }} />
          Révisions SM-2
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 30,
            color: "#F5F5FA",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Révisions du jour
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
          {dueSchedules.length > 0
            ? `${String(dueSchedules.length)} leçon${dueSchedules.length > 1 ? "s" : ""} à réviser · ${String(totalScheduled)} au total`
            : `Aucune révision en attente · ${String(totalScheduled)} planifiées`}
        </p>
      </div>

      {dueSchedules.length === 0 ? (
        /* All done */
        <div>
          <div
            style={{
              padding: "60px 40px",
              textAlign: "center",
              border: "1px solid rgba(10,255,212,0.2)",
              background: "rgba(10,255,212,0.04)",
              marginBottom: 24,
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, marginBottom: 16 }}>✓</div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 18,
                color: "#F5F5FA",
                margin: "0 0 8px",
              }}
            >
              Tout est à jour !
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#6B6890",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {totalScheduled === 0
                ? "Complète des leçons pour alimenter ta file de révisions."
                : "Reviens demain pour les prochaines révisions."}
            </p>
          </div>

          {totalScheduled === 0 && (
            <div style={{ textAlign: "center" }}>
              <Link
                href="/lessons"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 24px",
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
                Commencer une leçon →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dueSchedules.map((s) => {
            const overdueDays = Math.max(
              0,
              Math.floor((now.getTime() - s.nextReviewAt.getTime()) / 86_400_000),
            );
            return (
              <ReviewCard
                key={s.id}
                scheduleId={s.id}
                lessonTitle={s.lesson.title}
                lessonSlug={s.lesson.slug}
                lessonXp={s.lesson.xpReward}
                category={s.lesson.category}
                difficulty={s.lesson.difficulty}
                overdueDays={overdueDays}
              />
            );
          })}
        </div>
      )}

      {/* Upcoming */}
      {upcomingSchedules.length > 0 && (
        <div style={{ marginTop: 48 }}>
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
              marginBottom: 16,
            }}
          >
            <span
              style={{ width: 12, height: 1, background: "#2A2560", display: "inline-block" }}
            />
            Prochaines révisions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {upcomingSchedules.map((s) => {
              const daysUntil = Math.ceil((s.nextReviewAt.getTime() - now.getTime()) / 86_400_000);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: "rgba(5,4,26,0.3)",
                    borderBottom: "1px solid rgba(31,27,71,0.4)",
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
                    }}
                  >
                    dans {String(daysUntil)} jour{daysUntil > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
