import React from "react";
import type { ConsoleRatingRow } from "@cyberlearn/db";
import { Card, EmptyState } from "./admin-ui";

const dated = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "4,3 / 5 sur 12 avis", or null before the first. */
export function ratingSummary(avg: number | null, count: number): string | null {
  if (avg === null || count === 0) return null;
  return `${avg.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5 sur ${String(count)} avis`;
}

/**
 * What learners said about a lesson or a path: the note, and the comment
 * written to the team, newest first. Comments are not shown to other learners.
 * The path's page drew it alone; the lesson's page now reads the same card.
 */
export function RatingsCard({
  ratings,
  subject,
  avg,
  count,
}: {
  ratings: readonly ConsoleRatingRow[];
  /** "ce parcours", "cette leçon": what nobody has rated yet. */
  subject: string;
  /** The average kept on the row, over every rating and not only the ones listed. */
  avg: number | null;
  count: number;
}): React.ReactElement {
  const summary = ratingSummary(avg, count);
  return (
    <div style={{ marginTop: 24 }}>
      <Card
        title={`Avis des apprenants (${String(count)})`}
        action={
          summary !== null ? (
            <span className="mono" style={{ color: "var(--a-warning)", fontSize: 12 }}>
              {summary}
            </span>
          ) : undefined
        }
        pad
      >
        {ratings.length === 0 ? (
          <EmptyState title="Aucun avis" text={`Personne n'a encore noté ${subject}.`} />
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {ratings.map((r) => (
                  <tr key={r.id}>
                    <td
                      className="mono"
                      style={{ color: "var(--a-warning)", whiteSpace: "nowrap" }}
                      aria-label={`${String(r.score)} sur 5`}
                    >
                      {"★".repeat(r.score)}
                      <span style={{ color: "var(--a-muted)" }}>{"★".repeat(5 - r.score)}</span>
                    </td>
                    <td style={{ width: "100%" }}>
                      {r.feedback ?? (
                        <span style={{ color: "var(--a-muted)" }}>Sans commentaire</span>
                      )}
                    </td>
                    <td className="mono" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
                      {r.user?.displayName ?? r.user?.username ?? "Compte supprimé"}
                    </td>
                    <td className="mono" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
                      {dated.format(r.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
