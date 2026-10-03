import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { keepTokenSchema } from "@/lib/rgpd/keep-token";
import { keepAccountAction } from "./actions";
import { KeepCard, keepButtonStyle } from "./_components/keep-card";

export const metadata: Metadata = {
  title: "Garder mon compte",
  robots: { index: false, follow: false },
};

/**
 * Where the button of an inactivity notice leads. Opening the page changes
 * nothing: mail scanners open links on their own, and a click they made must
 * not count as the person's. The button posts the token.
 */
export default async function KeepAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const { token } = await searchParams;
  const parsed = keepTokenSchema.safeParse(token);

  if (!parsed.success) {
    return (
      <KeepCard tag="// ACCOUNT.KEEP" title="Ce lien n'est pas complet">
        <p style={{ margin: "0 0 16px" }}>
          Il manque une partie du lien reçu par e-mail. Ouvre-le à nouveau depuis le message, ou
          connecte-toi ici : te connecter sur le site garde aussi ton compte.
        </p>
        <Link href="/login" style={keepButtonStyle}>
          Me connecter
        </Link>
      </KeepCard>
    );
  }

  return (
    <KeepCard tag="// ACCOUNT.KEEP" title="Garder ton compte">
      <p style={{ margin: "0 0 16px" }}>
        Ton compte CyberLearn n&apos;a pas servi depuis bientôt deux ans et doit être supprimé. Un
        clic, et il reste : ta progression, tes badges et tes certificats avec lui.
      </p>
      <form action={keepAccountAction}>
        <input type="hidden" name="token" value={parsed.data} />
        <button type="submit" style={keepButtonStyle}>
          Garder mon compte
        </button>
      </form>
    </KeepCard>
  );
}
