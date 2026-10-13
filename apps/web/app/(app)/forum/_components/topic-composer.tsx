"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTopicAction } from "../_actions/forum-actions";

/** What has been written so far: kept by the window, which outlives the form. */
export interface TopicDraft {
  title: string;
  content: string;
}

/**
 * Opening a thread: a title, a message, and what the screen said if it said no.
 *
 * The draft is its holder's (new-topic-dialog.tsx): the form sits in a window
 * that Escape closes, and closing it must not throw away what was written.
 */
export function TopicComposer({
  categorySlug,
  categoryName,
  draft,
  onDraftChange,
}: {
  categorySlug: string;
  categoryName: string;
  draft: TopicDraft;
  onDraftChange: (draft: TopicDraft) => void;
}): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    setError(null);
    start(() => {
      void createTopicAction({
        categorySlug,
        title: draft.title,
        content: draft.content,
      }).then(
        (res) => {
          if (res.ok && res.href !== undefined) {
            // Straight to the thread either way. Its author can see it, marked as
            // withdrawn, which is a truer answer than a banner on the form. In
            // place of the window's step of the history: Back from the thread
            // goes to the section, not to an empty composer.
            router.replace(res.href);
            return;
          }
          setError(res.error ?? "Publication impossible.");
        },
        () => {
          // The call itself failed (the network, a deploy): nothing was written.
          setError("Publication impossible.");
        },
      );
    });
  };

  return (
    <form className="fo-form" onSubmit={submit}>
      <label>
        <span className="fo-label">Titre</span>
        <input
          className="fo-input"
          value={draft.title}
          onChange={(e) => {
            onDraftChange({ ...draft, title: e.target.value });
          }}
          maxLength={160}
          required
          placeholder={`Ta question dans ${categoryName}`}
        />
        <span className="fo-hint">
          Une phrase qui dit de quoi il s&apos;agit. C&apos;est ce que les autres verront dans la
          liste.
        </span>
      </label>

      <label>
        <span className="fo-label">Message</span>
        <textarea
          className="fo-textarea"
          value={draft.content}
          onChange={(e) => {
            onDraftChange({ ...draft, content: e.target.value });
          }}
          maxLength={10_000}
          required
          placeholder="Explique le contexte, ce que tu as déjà essayé, et où ça coince."
        />
        <span className="fo-hint">
          Markdown accepté : **gras**, `code`, listes, liens et blocs ```.
        </span>
      </label>

      {error !== null && (
        <p className="fo-error" role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn--accent btn--sm" disabled={pending}>
          {pending ? "Publication…" : "Publier le sujet"}
        </button>
      </div>
    </form>
  );
}
