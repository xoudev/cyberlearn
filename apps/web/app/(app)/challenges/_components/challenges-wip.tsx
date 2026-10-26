import React from "react";
import Link from "next/link";
import { BastionLogo } from "@/components/bastion-logo";
import "@/components/progression-workspace.css";

export function ChallengesWip(): React.ReactElement {
  return (
    <div className="progression-workspace">
      <section className="progression-empty">
        <BastionLogo size={64} />
        <div>
          <h2>Les défis se préparent.</h2>
          <p>
            Aucun défi n’est disponible pour le moment. En attendant, continue à pratiquer dans les
            leçons et les parcours.
          </p>
          <div className="workspace-actions">
            <Link href="/lessons" className="btn">
              Choisir une leçon ↗
            </Link>
            <Link href="/dashboard" className="workspace-link">
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
