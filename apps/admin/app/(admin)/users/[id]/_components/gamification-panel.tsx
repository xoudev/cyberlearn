import React from "react";
import { badgeRepository, userRepository, xpLedgerRepository } from "@cyberlearn/db";
import { RECENT_LEDGER_ROWS, XP_SOURCE_LABEL, signedXp } from "@/lib/gamification-corrections";
import { Card, Tag } from "../../../_components/admin-ui";
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
 * Every figure here is also in the cards at the top of the page; this is
 * where support answers "my streak vanished" or "that badge never came"
 * without resetting the whole account.
 *
 * Read here rather than handed down by the page, so the page only mounts it.
 * Each gesture is folded until needed: the page is read far more often than
 * anything on it is corrected. The XP ledger comes last, unfolded on demand,
 * so a correction can be checked against what the total is made of.
 */
export async function GamificationPanel({
  userId,
  handle,
}: {
  userId: string;
  /** How the confirmations name the account. */
  handle: string;
}): Promise<React.ReactElement | null> {
  const [standing, ledger, held, active] = await Promise.all([
    userRepository.findForGamification(userId),
    xpLedgerRepository.recentForUser(userId, RECENT_LEDGER_ROWS),
    badgeRepository.heldForConsole(userId),
    badgeRepository.findAllActive(),
  ]);
  if (!standing) return null;

  const heldIds = new Set(held.map((badge) => badge.badgeId));
  const grantable = active
    .filter((badge) => !heldIds.has(badge.id))
    .map((badge) => ({ id: badge.id, name: badge.name, xpReward: badge.xpReward }));

  return (
    <Card title="Corrections · XP, série, badges" pad>
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
            <BadgeGrantForm userId={userId} handle={handle} badges={grantable} />
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
                : `${count(ledger.length, "dernière ligne", "dernières lignes")}`}
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
