import React from "react";
import Link from "next/link";
import type { ConsoleRatingRow } from "@cyberlearn/db";
import { consoleDateFormat } from "@/lib/console-time";
import { Card, EmptyState, UserAvatar } from "./admin-ui";

const dated = consoleDateFormat({
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
 * What the card says under its rows when they are not all of them: "Les 10
 * plus récents sur 64.", or null when every rating is shown.
 */
export function ratingsShownText(shown: number, count: number): string | null {
  if (shown >= count) return null;
  return shown === 1
    ? `Le plus récent sur ${String(count)}.`
    : `Les ${String(shown)} plus récents sur ${String(count)}.`;
}

/**
 * What learners said about a lesson or a path: the note, and the comment
 * written to the team, newest first. Comments are not shown to other learners.
 * The path's page drew it alone; the lesson's page now reads the same card.
 *
 * It lists the latest only. When there are more, it says how many it shows
 * out of how many, and links to the page that pages through all of them when
 * there is one (a lesson's, /lessons/[id]/ratings).
 */
export function RatingsCard({
  ratings,
  subject,
  avg,
  count,
  allHref,
  avatarSrcs = [],
}: {
  ratings: readonly ConsoleRatingRow[];
  /**
   * The learners' pictures, in the order of the ratings, resolved by the page
   * (lib/avatar.ts). Missing ones show the initials.
   */
  avatarSrcs?: readonly (string | null)[];
  /** "ce parcours", "cette leçon": what nobody has rated yet. */
  subject: string;
  /** The average kept on the row, over every rating and not only the ones listed. */
  avg: number | null;
  count: number;
  /** The page listing every rating, when there is one. */
  allHref?: string;
}): React.ReactElement {
  const summary = ratingSummary(avg, count);
  const partial = ratingsShownText(ratings.length, count);
  return (
    <div style={{ marginTop: 24 }}>
      <Card
        title={`Avis des apprenants (${String(count)})`}
        action={
          summary !== null ? (
            <span style={{ color: "var(--a-warning)", fontSize: 12.5, fontWeight: 600 }}>
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
                {ratings.map((r, index) => (
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
                    <td style={{ color: "var(--a-fg-2)", whiteSpace: "nowrap" }}>
                      <span className="a-person">
                        <UserAvatar
                          src={avatarSrcs[index] ?? null}
                          name={r.user?.displayName ?? r.user?.username ?? "?"}
                          size={24}
                        />
                        {r.user?.displayName ?? r.user?.username ?? "Compte supprimé"}
                      </span>
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
        {partial !== null && ratings.length > 0 && (
          <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--a-muted)" }}>
            {partial}
            {allHref !== undefined && (
              <>
                {" "}
                <Link href={allHref} style={{ color: "var(--a-accent)" }}>
                  Voir tous les avis →
                </Link>
              </>
            )}
          </p>
        )}
      </Card>
    </div>
  );
}
