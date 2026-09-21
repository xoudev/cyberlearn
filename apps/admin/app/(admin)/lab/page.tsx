import React from "react";
import type { Metadata } from "next";
import { EMAIL_SAMPLES, renderEmailSample } from "@cyberlearn/email";
import { wrappedWindow } from "@cyberlearn/lib";
import { env } from "@/lib/env";
import { Card, PageHeader, Tag, UI } from "../_components/admin-ui";
import { EmailViewer } from "./_components/email-viewer";
import { ModerationProbe } from "./_components/moderation-probe";

export const metadata: Metadata = { title: "Banc d'essai" };
export const dynamic = "force-dynamic";

/**
 * A place to look at the things that are otherwise hard to look at.
 *
 * Three of the platform's surfaces can only normally be seen by waiting for
 * something: Wrapped opens in December, an e-mail template is visible once it
 * has been sent to somebody, and the moderation filter's behaviour is visible
 * once a student has written something. None of those is a way to find out
 * whether they still work.
 *
 * Read-only, deliberately and completely. Nothing on this page writes a row,
 * sends a message, or changes anybody's account - which is what makes it safe
 * to click every button on it, and that is the whole point of a bench. A
 * button that did something would belong on the page that does that thing,
 * next to the confirmation it needs.
 */
export default async function LabPage(): Promise<React.JSX.Element> {
  const samples = await Promise.all(
    EMAIL_SAMPLES.map(async (s) => ({ ...s, html: (await renderEmailSample(s.key)) ?? "" })),
  );

  const window = wrappedWindow(new Date());
  const wrappedUrl = `${env.NEXT_PUBLIC_SITE_URL}/wrapped?apercu=1`;

  return (
    <>
      <PageHeader
        eyebrow="Outils"
        title="Banc d'essai"
        description="Voir ce qui ne se montre qu'une fois par an, ou qu'une fois envoyé. Rien ici n'écrit, n'envoie ni ne modifie quoi que ce soit."
      />

      <Card
        title="Wrapped"
        action={
          <Tag tone={window.open ? "accent" : "neutral"}>
            {window.open ? "ouvert au public" : "fermé au public"}
          </Tag>
        }
        pad
      >
        <p style={{ font: `400 14px ${UI.sans}`, color: UI.fg2, margin: "0 0 12px" }}>
          {window.open
            ? `L'édition ${window.periodKey} est ouverte à tout le monde.`
            : `L'édition ${window.periodKey} rouvre au public le 1er décembre. Ce lien l'ouvre
               quand même, avec tes propres données, et pour un administrateur seulement.`}
        </p>
        <a
          href={wrappedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="a-btn a-btn--primary"
        >
          Ouvrir mon Wrapped {window.periodKey}
        </a>
      </Card>

      <Card
        title="Filtre de modération"
        action={<Tag tone="info">rien n&apos;est enregistré</Tag>}
        pad
      >
        <ModerationProbe />
      </Card>

      <Card title="Modèles d'e-mail" action={<Tag tone="info">aucun envoi</Tag>} pad>
        <EmailViewer samples={samples} />
      </Card>
    </>
  );
}
