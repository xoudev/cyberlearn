import React from "react";
import Link from "next/link";
import { BastionLogo } from "@/components/bastion-logo";
import "../verification.css";

export function VerificationFrame({
  children,
  detail = false,
}: {
  children: React.ReactNode;
  detail?: boolean;
}): React.ReactElement {
  return (
    <div className="verification-page">
      <header className="verification-header">
        <Link href="/" className="verification-brand" aria-label="CyberLearn · accueil">
          <BastionLogo size={32} />
          <span>
            CyberLearn<b>.</b>
          </span>
        </Link>
        <Link href={detail ? "/verify" : "/catalogue"}>
          {detail ? "Vérifier un autre certificat" : "Voir les parcours"}
        </Link>
      </header>
      <main id="contenu" className="verification-content">
        {children}
      </main>
    </div>
  );
}
