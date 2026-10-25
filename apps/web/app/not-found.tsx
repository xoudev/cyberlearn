import type { Metadata } from "next";
import Link from "next/link";
import { getRequestUser } from "@/lib/auth";
import { StandaloneFrame } from "@/components/standalone-frame";

export const metadata: Metadata = { title: "Page introuvable" };

export default async function NotFoundPage(): Promise<React.JSX.Element> {
  const signedIn = (await getRequestUser()) !== null;
  return (
    <StandaloneFrame titleId="not-found-title">
      <p className="state-code state-code--large">404</p>
      <h1 id="not-found-title" className="state-title">
        Cette page est introuvable.
      </h1>
      <p className="state-description">
        L’adresse est incorrecte, la page a été déplacée ou elle n’existe plus.
      </p>
      <div className="state-actions">
        <Link href={signedIn ? "/dashboard" : "/"} className="state-primary">
          {signedIn ? "Retour au tableau de bord" : "Retour à l’accueil"}
        </Link>
        <Link href={signedIn ? "/paths" : "/catalogue"} className="state-secondary">
          Voir les parcours
        </Link>
      </div>
    </StandaloneFrame>
  );
}
