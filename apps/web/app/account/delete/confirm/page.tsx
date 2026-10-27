import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { StandaloneFrame } from "@/components/standalone-frame";

// Confirmation tokens must be rendered for each request, never cached.
export const dynamic = "force-dynamic";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);

// A GET only presents the confirmation; the existing POST route consumes its token.
export default async function AccountDeleteConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const parsed = tokenSchema.safeParse((await searchParams).token);
  if (!parsed.success) redirect("/account/delete/error?reason=invalid");
  return (
    <StandaloneFrame danger>
      <p className="state-code">Suppression définitive</p>
      <h1 id="standalone-title" className="state-title">
        Confirmer la suppression de ton compte
      </h1>
      <div className="state-description">
        <p>
          Ton profil, ta progression, tes badges et tes notes seront effacés. Tes certificats
          restent vérifiables publiquement, mais ne portent plus ton nom.{" "}
          <b>Cette action est irréversible.</b>
        </p>
        <p>
          Si tu n’es pas à l’origine de cette demande, ferme simplement cette page : rien ne sera
          supprimé.
        </p>
      </div>
      <form method="POST" action="/api/me/delete/confirm" className="state-actions">
        <input type="hidden" name="token" value={parsed.data} />
        <button className="state-primary state-primary--danger" type="submit">
          Supprimer définitivement
        </button>
        <Link className="state-secondary" href="/dashboard">
          Annuler
        </Link>
      </form>
    </StandaloneFrame>
  );
}
