import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { ClassPanel } from "./_components/class-panel";

export const metadata: Metadata = { title: "Ma classe" };
export const dynamic = "force-dynamic";

/**
 * The class page, for both sides of a class.
 *
 * A student sees theirs and who else is in it. A teacher sees the ones they
 * follow, grouped the way they are filed, and how far each student has got.
 * Someone who is both - a teacher enrolled in a class of their own - sees both
 * sections.
 *
 * There is no role check. Teaching a class and being in one are facts about the
 * class tables, and both queries are scoped by the caller's own id, so the role
 * would only ever be a second, less reliable way of asking the same question -
 * and it was the thing keeping students off a page that lists their classmates.
 *
 * Read-only by design: a class is composed in the admin console, not here.
 */
export default async function MyClassPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const [establishments, memberships] = await Promise.all([
    classRepository.findForTeacher(authUser.id),
    classRepository.findForMember(authUser.id),
  ]);

  // No class either way, no page. An empty shell saying so is a page that
  // exists only to say it has nothing, and the sidebar entry leading to it
  // would say the same thing twice.
  if (establishments.length === 0 && memberships.length === 0) notFound();

  const classIds = establishments.flatMap((e) =>
    e.promotions.flatMap((p) => p.classes.map((c) => c.id)),
  );

  // One grouped count for every class at once rather than a query per class.
  const progress = await prisma.userLessonProgress.groupBy({
    by: ["userId"],
    where: {
      status: "COMPLETED",
      user: { classMemberships: { some: { classId: { in: classIds } } } },
    },
    _count: { lessonId: true },
  });
  const completedByUser = new Map(progress.map((p) => [p.userId, p._count.lessonId]));

  const rosters = new Map(
    await Promise.all(
      classIds.map(
        async (id) => [id, await classRepository.findMembersVisibleTo(id, authUser.id)] as const,
      ),
    ),
  );

  return (
    <div className="page-container">
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(34px, 4vw, 52px)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "#F5F5FA",
          margin: "0 0 10px",
        }}
      >
        {establishments.length > 0 ? "Mes classes" : "Ma classe"}
      </h1>
      <p style={{ color: "#B8B5D1", fontSize: 15, margin: "0 0 40px", maxWidth: 560 }}>
        {establishments.length > 0
          ? "La progression de tes élèves, en lecture seule. La composition des classes est gérée par l'administration."
          : "Ta classe et les personnes qui la composent. La composition est gérée par l'administration."}
      </p>

      {/* The student's own class first: someone who is both a teacher and a
          member is a teacher taking a course, and their own enrolment is the
          part that concerns them rather than their pupils. */}
      {memberships.length > 0 && <ClassPanel userId={authUser.id} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {establishments.map((est) => (
          <section key={est.id}>
            <h2
              style={{
                fontFamily: "var(--font-display, sans-serif)",
                fontWeight: 700,
                fontSize: 20,
                color: "#F5F5FA",
                margin: "0 0 2px",
              }}
            >
              {est.name}
            </h2>
            {est.city !== null && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginBottom: 16,
                }}
              >
                {est.city}
              </div>
            )}

            {est.promotions.map((promo) => (
              <div key={promo.id} style={{ marginBottom: 22 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#44406B",
                    marginBottom: 12,
                  }}
                >
                  {promo.name}
                  {promo.startYear !== null && ` · ${String(promo.startYear)}`}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {promo.classes.map((c) => {
                    const roster = rosters.get(c.id);
                    const members = roster?.members ?? [];
                    return (
                      <section
                        key={c.id}
                        style={{
                          border: "1px solid #2A2560",
                          borderLeft: "3px solid #0AFFD4",
                          background: "rgba(5,4,26,0.6)",
                          padding: "18px 20px",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "var(--font-display, sans-serif)",
                            fontWeight: 700,
                            fontSize: 17,
                            color: "#F5F5FA",
                            margin: "0 0 12px",
                          }}
                        >
                          {c.name}
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: "#6B6890",
                              fontWeight: 400,
                              marginLeft: 10,
                            }}
                          >
                            {c.memberCount} élève{c.memberCount > 1 ? "s" : ""}
                          </span>
                        </h3>

                        {members.length === 0 ? (
                          <p
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "#6B6890",
                              margin: 0,
                            }}
                          >
                            Aucun élève dans cette classe.
                          </p>
                        ) : (
                          <ul className="class-roster">
                            {members.map((m) => (
                              <li key={m.user.id} className="class-roster__item">
                                {/* A teacher sees their own students by name:
                                      publicProfile hides a learner from strangers
                                      on the leaderboard, not from the person
                                      responsible for following them. */}
                                <span className="class-roster__name">
                                  {m.user.displayName || (m.user.username ?? "—")}
                                </span>
                                <span className="class-roster__meta">
                                  LVL·{m.user.level} · {completedByUser.get(m.user.id) ?? 0} leçon
                                  {(completedByUser.get(m.user.id) ?? 0) > 1 ? "s" : ""} ·{" "}
                                  {m.user.streakDays} j
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
