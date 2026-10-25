import React from "react";
import Link from "next/link";
import { StandaloneFrame } from "@/components/standalone-frame";

export default function AccountDeleteSuccessPage(): React.JSX.Element {
  return (
    <StandaloneFrame>
      <p className="state-code">Suppression terminée</p>
      <h1 id="standalone-title" className="state-title">
        Compte supprimé
      </h1>
      <div className="state-description">
        <p>Ton compte a été supprimé, comme tu l’as demandé. Merci d’avoir utilisé Cyber Learn.</p>
        <p>
          Tes certificats restent vérifiables publiquement à leur URL d’origine, mais ne portent
          plus ton nom.
        </p>
      </div>
      <dl className="state-facts">
        <div>
          <dt>Statut</dt>
          <dd>Anonymisé</dd>
        </div>
        <div>
          <dt>Certificats</dt>
          <dd>Conservés</dd>
        </div>
        <div>
          <dt>Données</dt>
          <dd>Effacées</dd>
        </div>
      </dl>
      <Link className="state-primary" href="/">
        Retour à l’accueil
      </Link>
    </StandaloneFrame>
  );
}
