import React from "react";
import type { HeldBadge, XpLedgerRow } from "@cyberlearn/db";
import { XP_SOURCE_LABEL, grantableBadges, signedXp } from "@/lib/gamification-corrections";
import { Card, Tag } from "../../../_components/admin-ui";
import { USER_CARDS } from "../../_components/columns";
import {
  BadgeGrantForm,
  BadgeRevokeForm,
  StreakCorrectionForm,
  XpAdjustForm,
} from "./gamification-corrections";

const stamp = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function count(value: number, one: string, many: string): string {
  return `${value.toLocaleString("fr-FR")} ${value > 1 ? many : one}`;
}

/**
 * What an account earned, corrected by hand: its XP, its streak, its badges.
 * The figures are the cards at the top of the page; this is where support
 * answers "my streak vanished" or "that badge never came" without resetting
 * the whole account. Read by the page, like every panel of the record; the
 * corrections are the client islands.
 *
 * Each gesture is folded until needed: the page is read far more often than
 * anything on it is corrected. The XP ledger comes last, unfolded on demand,
 * so a correction can be checked against what the total is made of.
 */
export function GamificationPanel({
  userId,
  handle,
  standing,
  ledger,
  held,
  activeBadges,
}: {
  userId: string;
  /** How the confirmations name the account. */
  handle: string;
  standing: {
    xpTotal: number;
    level: number;
    streakDays: number;
    longestStreak: number;
    streakFreezes: number;
  };
  /** The latest lines of the XP ledger, newest first. */
  ledger: XpLedgerRow[];
  /** The badges the account holds, newest first. */
  held: HeldBadge[];
  /** Every active badge, those held included. */
  activeBadges: { id: string; name: string; xpReward: number }[];
}): React.ReactElement {
  return (
    <Card title={USER_CARDS.gamification} pad>
      <div className="a-stack-tight">
        <details className="a-disclosure">
          <summary className="a-disclosure-head">
            <span className="a-disclosure-title">Ajouter ou retirer de l&apos;XP</span>
            <span className="mono a-disclosure-meta">
              {standing.xpTotal.toLocaleString("fr-FR")} XP · niveau {standing.level}
            </span>
          </summary>
          <div className="a-disclosure-body">
            <XpAdjustForm userId={userId} handle={handle} />
          </div>
        </details>

        <details className="a-disclosure">
          <summary className="a-disclosure-head">
            <span className="a-disclosure-title">Corriger la série</span>
            <span className="mono a-disclosure-meta">
              {count(standing.streakDays, "jour", "jours")} · record {standing.longestStreak} ·{" "}
              {count(standing.streakFreezes, "gel", "gels")}
            </span>
          </summary>
          <div className="a-disclosure-body">
            <StreakCorrectionForm
              userId={userId}
              handle={handle}
              streakDays={standing.streakDays}
              streakFreezes={standing.streakFreezes}
            />
          </div>
        </details>

        <details className="a-disclosure">
          <summary className="a-disclosure-head">
            <span className="a-disclosure-title">Attribuer ou retirer un badge</span>
            <span className="mono a-disclosure-meta">
              {count(held.length, "obtenu", "obtenus")}
            </span>
          </summary>
          <div className="a-disclosure-body a-stack">
            {held.length > 0 && (
              <div className="a-table-wrap">
                <table className="a-table">
                  <tbody>
                    {held.map((badge) => (
                      <tr key={badge.badgeId}>
                        <td>{badge.name}</td>
                        <td className="mono a-field-hint">{stamp.format(badge.earnedAt)}</td>
                        <td align="right" className="mono a-field-hint">
                          {badge.xpCredited > 0 ? signedXp(badge.xpCredited) : "0 XP"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <BadgeGrantForm
              userId={userId}
              handle={handle}
              badges={grantableBadges(activeBadges, held)}
            />
            <BadgeRevokeForm
              userId={userId}
              handle={handle}
              badges={held.map((badge) => ({
                id: badge.badgeId,
                name: badge.name,
                xpCredited: badge.xpCredited,
              }))}
            />
          </div>
        </details>

        <details className="a-disclosure">
          <summary className="a-disclosure-head">
            <span className="a-disclosure-title">Registre d&apos;XP</span>
            <span className="mono a-disclosure-meta">
              {ledger.length === 0
                ? "aucune ligne"
                : count(ledger.length, "dernière ligne", "dernières lignes")}
            </span>
          </summary>
          <div className="a-disclosure-body">
            {ledger.length === 0 ? (
              <p className="a-field-hint">
                Aucune ligne : ce compte n&apos;a rien gagné depuis que le registre existe.
              </p>
            ) : (
              <div className="a-table-wrap">
                <table className="a-table">
                  <tbody>
                    {ledger.map((row) => (
                      <tr key={row.id}>
                        <td className="mono a-field-hint">{stamp.format(row.createdAt)}</td>
                        <td>
                          {row.source === "ADJUSTMENT" ? (
                            <Tag tone="warning">{XP_SOURCE_LABEL[row.source]}</Tag>
                          ) : (
                            XP_SOURCE_LABEL[row.source]
                          )}
                        </td>
                        <td align="right" className="mono">
                          {signedXp(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      </div>
    </Card>
  );
}
