import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository, userRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes classes" };
export const dynamic = "force-dynamic";

/**
 * What a teacher sees: their classes, grouped the way they are filed, and how
 * far each student has got. Read-only by design - a teacher follows a class,
 * they do not compose it, so there is nothing here that writes.
 *
 * The role is read from the database rather than the session claim. A teacher
 * whose role was just removed loses this page on their next request, without
 * waiting for a token to expire.
 */
export default async function TeacherClassesPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const dbUser = await userRepository.findRoleById(authUser.id);
  if (dbUser?.role !== "TEACHER" && dbUser?.role !== "ADMIN") notFound();

  const establishments = await classRepository.findForTeacher(authUser.id);

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
        Mes classes
      </h1>
      <p style={{ color: "#B8B5D1", fontSize: 15, margin: "0 0 40px", maxWidth: 560 }}>
        La progression de tes élèves, en lecture seule. La composition des classes est gérée par
        l&apos;administration.
      </p>

      {establishments.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#6B6890",
            border: "1px solid #2A2560",
            padding: "18px 20px",
          }}
        >
          Aucune classe ne t&apos;est assignée pour l&apos;instant.
        </p>
      ) : (
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
      )}
    </div>
  );
}
