import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { KeepCard } from "../_components/keep-card";

export const metadata: Metadata = {
  title: "Garder mon compte",
  robots: { index: false, follow: false },
};

/** What became of a "Garder mon compte" click. */
export default async function KeepAccountDonePage({
  searchParams,
}: {
  searchParams: Promise<{ kept?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const { kept } = await searchParams;

  if (kept === "1") {
    return (
      <KeepCard title="Ton compte est gardé">
        <p style={{ margin: "0 0 16px" }}>
          Il ne sera pas supprimé. Il le serait de nouveau après 24 mois sans connexion, et tu
          recevrais un e-mail un mois avant, comme celui-ci.
        </p>
        <Link href="/login" className="state-primary">
          Me connecter
        </Link>
      </KeepCard>
    );
  }

  return (
    <KeepCard title="Ce lien ne sert plus">
      <p style={{ margin: "0 0 16px" }}>
        Il a déjà servi, ou le compte qu&apos;il gardait n&apos;existe plus. Si tu peux te
        connecter, ton compte est là, et te connecter sur le site suffit à le garder.
      </p>
      <Link href="/login" className="state-primary">
        Me connecter
      </Link>
    </KeepCard>
  );
}
