import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { DUEL_STATUS_LABELS } from "@cyberlearn/lib/social/duel";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { duelSetupFor, listDuelsFor, type DuelSummary } from "@/lib/social/duels";
import { NewDuelForm } from "./_components/new-duel-form";
import { RespondButtons } from "./_components/respond-buttons";

export const metadata: Metadata = { title: "Duels" };

interface Props {
  searchParams: Promise<{ ami?: string }>;
}

function scoreOf(duel: DuelSummary): string {
  return `${String(duel.readerScore.correct)} à ${String(duel.otherScore.correct)}`;
}

function resultOf(duel: DuelSummary): string {
  if (duel.status !== "FINISHED") return DUEL_STATUS_LABELS[duel.status];
  if (duel.winner === "draw") return `Égalité, ${scoreOf(duel)}`;
  return `${duel.winner === "reader" ? "Victoire" : "Défaite"}, ${scoreOf(duel)}`;
}

/**
 * Quiz duels between friends: challenge one on a path, answer the invitations
 * waiting, and the duels going on or settled. A duel opens on its own page.
 */
export default async function DuelsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { ami } = await searchParams;
  const [duels, setup] = await Promise.all([listDuelsFor(user.id), duelSetupFor(user.id)]);
  const invitations = duels.filter((d) => d.status === "PENDING" && !d.readerIsChallenger);
  const others = duels.filter((d) => !invitations.includes(d));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 28 }}>
      <Crumb segments={["duels"]} />
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0 }}>Duels</h1>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Défie un ami sur un parcours : cinq questions tirées de ses leçons, les mêmes pour vous
          deux. Chacun répond de son côté, et voit le score de l&apos;autre avancer. Le plus de
          bonnes réponses gagne ; à égalité, celui qui a fini le premier. Un duel attend un jour
          d&apos;être accepté, puis dure un jour.
        </p>
      </header>

      {invitations.length > 0 ? (
        <section aria-label="Invitations" style={{ display: "grid", gap: 10 }}>
          <span className="mono-label" style={{ color: "var(--cosmetic-accent)" }}>
            {"// "}On te défie
          </span>
          {invitations.map((duel) => (
            <div
              key={duel.id}
              className="card"
              style={{
                padding: "14px 18px",
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span style={{ flex: 1, minWidth: 220 }}>
                <strong>{duel.other.name}</strong> te défie sur « {duel.pathTitle} ».
              </span>
              <RespondButtons duelId={duel.id} />
            </div>
          ))}
        </section>
      ) : null}

      <section aria-label="Lancer un duel" style={{ display: "grid", gap: 10 }}>
        <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
          {"// "}Lancer un duel
        </span>
        {setup.friends.length === 0 ? (
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
            Un duel se joue entre amis : ajoute quelqu&apos;un depuis son profil, puis reviens ici.
          </p>
        ) : (
          <NewDuelForm friends={setup.friends} paths={setup.paths} initialFriend={ami ?? null} />
        )}
      </section>

      <section aria-label="Tes duels" style={{ display: "grid", gap: 10 }}>
        <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
          {"// "}Tes duels
        </span>
        {others.length === 0 ? (
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
            Aucun duel pour l&apos;instant.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {others.map((duel) => (
              <li key={duel.id}>
                <Link
                  href={`/duels/${duel.id}`}
                  className="card"
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    gap: 12,
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    textDecoration: "none",
                  }}
                >
                  <span>
                    {duel.readerIsChallenger ? "Contre " : "Défi de "}
                    <strong>{duel.other.name}</strong> · {duel.pathTitle}
                  </span>
                  <span
                    style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}
                  >
                    {resultOf(duel)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
