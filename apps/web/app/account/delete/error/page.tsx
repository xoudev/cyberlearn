import React from "react";
import Link from "next/link";
import { z } from "zod";
import { StandaloneFrame } from "@/components/standalone-frame";

const reasonSchema = z.enum([
  "missing",
  "invalid",
  "expired",
  "used",
  "internal",
  "auth_cleanup_failed",
]);
const MESSAGES: Record<string, { text: string; accent: string }> = {
  missing: { text: "Lien invalide ou expiré.", accent: "var(--color-warning)" },
  invalid: { text: "Lien invalide ou expiré.", accent: "var(--color-warning)" },
  expired: {
    text: "Ce lien de confirmation a expiré. Si tu veux toujours supprimer ton compte, refais la demande depuis tes paramètres.",
    accent: "var(--color-warning)",
  },
  used: { text: "Ce lien a déjà été utilisé.", accent: "var(--color-warning)" },
  internal: {
    text: "Une erreur est survenue lors de la suppression. Écris à privacy@cyberlearn.fr si le problème persiste.",
    accent: "var(--color-danger)",
  },
  auth_cleanup_failed: {
    text: "Tes données ont été supprimées de notre base, mais nous n'avons pas pu finaliser la suppression côté authentification. Notre équipe a été prévenue. Écris à privacy@cyberlearn.fr pour confirmer la clôture complète.",
    accent: "var(--color-danger)",
  },
};

const DEFAULT: { text: string; accent: string } = {
  text: "Une erreur est survenue. Réessaie, ou écris au support.",
  accent: "var(--color-danger)",
};

export default async function AccountDeleteErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const parsed = reasonSchema.safeParse((await searchParams).reason);
  const reason = parsed.success ? parsed.data : "unknown";
  const { text, accent } = parsed.success ? (MESSAGES[parsed.data] ?? DEFAULT) : DEFAULT;
  return (
    <StandaloneFrame danger>
      <p className="state-code" style={{ color: accent }}>
        Suppression du compte
      </p>
      <h1 id="standalone-title" className="state-title">
        Impossible de confirmer la suppression
      </h1>
      <p className="state-description">{text}</p>
      <dl className="state-facts state-facts--compact">
        <div>
          <dt>Raison</dt>
          <dd>{reason}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>
            <a href="mailto:privacy@cyberlearn.fr">privacy@cyberlearn.fr</a>
          </dd>
        </div>
      </dl>
      <Link className="state-secondary" href="/">
        Retour à l’accueil
      </Link>
    </StandaloneFrame>
  );
}
