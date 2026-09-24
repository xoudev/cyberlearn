import React from "react";
import Link from "next/link";

/**
 * The page for the eleven months Wrapped is shut.
 *
 * It says when it opens and roughly what it will hold, because a locked door
 * with no sign on it reads as something broken. It does not show a teaser of
 * the figures: half a recap spends the surprise the event exists for.
 */
export function WrappedClosed({
  periodKey,
  opensOn,
}: {
  /** The year the next edition will recap. */
  periodKey: string;
  /** "YYYY-MM-DD" in Europe/Paris, or null (never, while it is shut). */
  opensOn: string | null;
}): React.JSX.Element {
  const opensLabel =
    opensOn === null
      ? null
      : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
          new Date(`${opensOn}T12:00:00Z`),
        );

  const days =
    opensOn === null
      ? null
      : Math.max(
          0,
          Math.ceil(
            (new Date(`${opensOn}T00:00:00Z`).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        );

  return (
    <div className="page-container wr-closed">
      <p className="wr-closed__eyebrow">CyberLearn Wrapped</p>
      <h1 className="wr-closed__year">{periodKey}</h1>
      <p className="wr-closed__lede">
        Ton récap de l&apos;année n&apos;est pas encore ouvert. Il arrive en décembre, une fois par
        an, le temps que l&apos;année ait quelque chose à raconter.
      </p>

      {opensLabel !== null && (
        <p className="wr-closed__when">
          Ouverture le <b>{opensLabel}</b>
          {days !== null && days > 0 && (
            <>
              {" · "}
              <b>{days}</b> jour{days > 1 ? "s" : ""}
            </>
          )}
        </p>
      )}

      <p className="wr-closed__hint">
        D&apos;ici là, tout ce que tu termines compte pour le prochain.
      </p>

      <Link href="/dashboard" className="cls-btn cls-btn--link">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
