import React from "react";
import Link from "next/link";
import { classRepository } from "@cyberlearn/db";

/**
 * The class a learner belongs to, and who else is in it.
 *
 * Renders nothing at all when they belong to none - which is most people. A
 * learner outside a school is a STUDENT with an empty membership list, not a
 * lesser kind of account, and an empty "Ma classe" heading would make it look
 * like something is missing.
 *
 * A classmate who has turned publicProfile off shows as "Anonyme", the same way
 * they already do on the leaderboard: one preference, honoured everywhere,
 * rather than a second setting for a second surface.
 */
export async function ClassPanel({ userId }: { userId: string }): Promise<React.ReactElement> {
  const classes = await classRepository.findForMember(userId);
  if (classes.length === 0) return <></>;

  const rosters = await Promise.all(
    classes.map(async (c) => ({
      klass: c,
      roster: await classRepository.findMembersVisibleTo(c.id, userId),
    })),
  );

  return (
    <div style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#6F6B99",
          margin: "0 0 16px",
        }}
      >
        {classes.length > 1 ? "Mes classes" : "Ma classe"}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rosters.map(({ klass, roster }) => {
          const classmates = (roster?.members ?? []).filter((m) => m.user.id !== userId);
          return (
            <section
              key={klass.id}
              style={{
                border: "1px solid #2A2560",
                borderLeft: "3px solid #0AFFD4",
                background: "rgba(5,4,26,0.6)",
                padding: "20px 22px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginBottom: 6,
                }}
              >
                {klass.promotion.establishment.name}
                {klass.promotion.establishment.city !== null &&
                  ` · ${klass.promotion.establishment.city}`}
                {" — "}
                {klass.promotion.name}
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-display, sans-serif)",
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  color: "#F5F5FA",
                  margin: "0 0 4px",
                }}
              >
                {klass.name}
              </h3>

              {klass.teachers.length > 0 && (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#6B6890",
                    margin: "0 0 18px",
                  }}
                >
                  {klass.teachers
                    .map(
                      (t) =>
                        `${t.teacher.displayName || (t.teacher.username ?? "—")}${
                          t.subject !== null ? ` · ${t.subject}` : ""
                        }`,
                    )
                    .join("   ")}
                </p>
              )}

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginBottom: 10,
                }}
              >
                {classmates.length === 0
                  ? "Tu es seul·e dans cette classe pour l'instant"
                  : `${String(classmates.length)} camarade${classmates.length > 1 ? "s" : ""}`}
              </div>

              {classmates.length > 0 && (
                <ul className="class-roster">
                  {classmates.map((m) => {
                    const visible = m.user.preferences?.publicProfile !== false;
                    const name = visible
                      ? m.user.displayName || (m.user.username ?? "—")
                      : "Anonyme";
                    return (
                      <li key={m.user.id} className="class-roster__item">
                        <span className="class-roster__name">
                          {visible && m.user.username !== null ? (
                            <Link
                              href={`/u/${m.user.username}`}
                              style={{ color: "inherit", textDecoration: "none" }}
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </span>
                        <span className="class-roster__meta">
                          LVL·{m.user.level}
                          {visible && <> · {m.user.xpTotal.toLocaleString("fr-FR")} XP</>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
