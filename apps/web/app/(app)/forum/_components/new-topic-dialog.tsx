"use client";

// "use client" justification: the composer is a window over the section,
// opened and closed by the address in the browser, and its draft is kept
// while it is closed.

import React, { useState } from "react";
import { ModalShell } from "@cyberlearn/ui";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { TopicComposer, type TopicDraft } from "./topic-composer";

/** The parameter that opens the composer over a section: `?compose=1`. */
export const COMPOSE_QUERY = "compose";

const EMPTY_DRAFT: TopicDraft = { title: "", content: "" };

/**
 * "Nouveau sujet" on a section of the forum, and the composer it opens over
 * the section's list.
 *
 * Opening a thread used to be a page of its own, /forum/<section>/nouveau,
 * with nothing on it but the form, and the list one came from gone. The form
 * is a window now (?compose=1), and the old address redirects to the section
 * with it open (next.config.ts). It belongs to this page alone, so the page
 * draws it rather than the site-wide registry (docs/dev/dialogs.md).
 *
 * The section page has already checked the session and that the section
 * exists; the action checks both again when the thread is written
 * (createTopicAction, then forum-service's createForumTopic).
 *
 * The draft is held here, outside the window: Escape or a click beside it
 * closes it, and what was written is still there when it opens again.
 */
export function NewTopicDialog({
  categorySlug,
  categoryName,
}: {
  categorySlug: string;
  categoryName: string;
}): React.JSX.Element {
  const compose = useQueryDialog(COMPOSE_QUERY);
  const [draft, setDraft] = useState<TopicDraft>(EMPTY_DRAFT);

  return (
    <>
      <button
        type="button"
        className="btn btn--accent btn--sm"
        aria-haspopup="dialog"
        onClick={() => {
          compose.open();
        }}
      >
        Nouveau sujet
      </button>

      <ModalShell
        open={compose.value !== null}
        onClose={compose.close}
        eyebrow={categoryName}
        title="Nouveau sujet"
        meta="Tout le monde sur la plateforme peut le lire et y répondre."
        maxWidth={720}
        className="fo-compose"
      >
        <TopicComposer
          categorySlug={categorySlug}
          categoryName={categoryName}
          draft={draft}
          onDraftChange={setDraft}
        />
      </ModalShell>
    </>
  );
}
