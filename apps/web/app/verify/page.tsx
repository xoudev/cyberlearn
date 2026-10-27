import React from "react";
import type { Metadata } from "next";
import { pageAddress } from "@/app/page-metadata";
import { VerifyForm } from "./_components/verify-form";
import { VerificationFrame } from "./_components/verification-frame";

export const metadata: Metadata = {
  title: "Vérifier un certificat",
  description: "Vérifie l’authenticité d’un certificat Cyber Learn.",
  ...pageAddress("/verify"),
};

export default function VerifyPage(): React.JSX.Element {
  return (
    <VerificationFrame>
      <div className="verification-entry">
        <header>
          <p className="verification-kicker">Registre des certificats</p>
          <h1>
            Vérifier un certificat<span>.</span>
          </h1>
          <p>
            Retrouve le titulaire, le parcours et le statut d’un certificat CyberLearn à partir du
            numéro ou de l’adresse imprimés sur le document.
          </p>
        </header>
        <section className="verification-search" aria-label="Rechercher un certificat">
          <VerifyForm />
        </section>
      </div>
    </VerificationFrame>
  );
}
