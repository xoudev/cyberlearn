"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { deleteWriteupAction, publishWriteupAction } from "../_actions/writeup-actions";

/** What the editor says about a solution nobody else sees, by who took it down. */
const HELD = "Ta solution attend une relecture : personne d'autre ne la voit encore.";
const HIDDEN_BY_MODERATION =
  "Ta solution a été masquée par la modération : personne d'autre ne la voit, et tu ne peux pas la republier. Tu peux la retirer.";

/**
 * The reader's own solution: written, replaced or removed. The text is
 * Markdown, as in the forum (code blocks, lists, links). A solution the
 * screen flags is kept hidden until a moderator decides, and the editor
 * says so rather than letting it look published. One a moderator hid says
 * that instead: it cannot be published again, only removed.
 */
export function WriteupEditor({
  challengeId,
  initial,
}: {
  challengeId: string;
  initial: { content: string; isHidden: boolean; hiddenByModeration: boolean } | null;
}): React.ReactElement {
  const router = useRouter();
  const moderated = initial?.hiddenByModeration === true;
  const [content, setContent] = useState(initial?.content ?? "");
  const [message, setMessage] = useState<{ tone: "ok" | "held" | "error"; text: string } | null>(
    moderated
      ? { tone: "error", text: HIDDEN_BY_MODERATION }
      : initial?.isHidden === true
        ? { tone: "held", text: HELD }
        : null,
  );
  const [pending, startTransition] = useTransition();

  // A call that fails inside a transition goes to the nearest error boundary,
  // the site's own, and takes the challenge page with the solution being
  // written. It is said under the field instead, with the text kept.
  const publish = (): void => {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof publishWriteupAction>>;
      try {
        result = await publishWriteupAction({ challengeId, content });
      } catch {
        setMessage({ tone: "error", text: "Solution non envoyée, réessaie." });
        return;
      }
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage(
        result.heldForReview === true
          ? {
              tone: "held",
              text: "Enregistrée, et en attente d'une relecture : personne d'autre ne la voit encore.",
            }
          : { tone: "ok", text: "Solution publiée : les autres qui ont résolu le défi la voient." },
      );
      router.refresh();
    });
  };

  const remove = (): void => {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof deleteWriteupAction>>;
      try {
        result = await deleteWriteupAction(challengeId);
      } catch {
        setMessage({ tone: "error", text: "Solution non retirée, réessaie." });
        return;
      }
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setContent("");
      setMessage({ tone: "ok", text: "Solution retirée." });
      router.refresh();
    });
  };

  return (
    <div className="card writeup-editor">
      <label htmlFor={`writeup-${challengeId}`} className="writeup-editor__label">
        Ta solution {moderated ? "(masquée)" : initial !== null ? "(publiée)" : ""}
      </label>
      <textarea
        id={`writeup-${challengeId}`}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
        }}
        rows={8}
        maxLength={10000}
        readOnly={moderated}
        placeholder="Explique ta démarche : par où tu as commencé, ce qui a coincé, la commande ou le code qui a marché. Markdown accepté (```code```, listes, liens)."
      />
      <div className="writeup-editor__bar">
        <button
          type="button"
          className="btn btn--accent btn--sm"
          onClick={publish}
          disabled={pending || moderated || content.trim().length === 0}
        >
          {initial !== null ? "Mettre à jour" : "Publier ma solution"}
        </button>
        {initial !== null ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={remove}
            disabled={pending}
          >
            Retirer
          </button>
        ) : null}
        <span className="writeup-editor__count">{String(content.trim().length)} / 10 000</span>
      </div>
      <p aria-live="polite" className="writeup-editor__message" data-tone={message?.tone}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
