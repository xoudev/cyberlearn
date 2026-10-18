import Link from "next/link";
import React from "react";
import type { DuelSummary } from "@/lib/social/duels";
import { InvitationCard } from "@/app/(app)/duels/_components/invitation-card";

/**
 * The duels a friend sent the reader, still waiting on an answer: the same
 * cards as the duels' list, answered from here. An invitation lapses after a
 * day, which is why it is on the dashboard and not only one click away.
 * Drawn only when there is one.
 */
export function DuelInvites({ duels }: { duels: DuelSummary[] }): React.ReactElement {
  return (
    <section className="dash-sec dl" aria-labelledby="dash-duels-title">
      <div className="dash-sec-head">
        <h2 id="dash-duels-title">Défis reçus</h2>
        <span className="dash-sec-count">
          {duels.length} {duels.length > 1 ? "invitations" : "invitation"}
        </span>
        <Link href="/duels" className="dash-sec-link">
          Tous les duels
        </Link>
      </div>
      <ul className="dl-invites">
        {duels.map((duel) => (
          <InvitationCard key={duel.id} duel={duel} />
        ))}
      </ul>
    </section>
  );
}
