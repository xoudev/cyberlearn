"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTopicAction } from "../_actions/forum-actions";

/** Opening a thread: a title, a message, and what the screen said if it said no. */
export function TopicComposer({
  categorySlug,
  categoryName,
}: {
  categorySlug: string;
  categoryName: string;
}): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    setError(null);
    start(() => {
      void createTopicAction({ categorySlug, title, content }).then((res) => {
        if (res.ok && res.href !== undefined) {
          // Straight to the thread either way. Its author can see it, marked as
          // withdrawn, which is a truer answer than a banner on the form.
          router.push(res.href);
          return;
        }
        setError(res.error ?? "Publication impossible.");
      });
    });
  };

  return (
    <form className="fo-form" onSubmit={submit}>
      <label>
        <span className="fo-label">Titre</span>
        <input
          className="fo-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
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
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
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
        <button type="submit" className="fo-btn fo-btn--primary" disabled={pending}>
          {pending ? "Publication…" : "Publier le sujet"}
        </button>
      </div>
    </form>
  );
}
