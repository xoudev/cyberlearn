"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { deleteWriteupAction, publishWriteupAction } from "../_actions/writeup-actions";

/**
 * The reader's own solution: written, replaced or removed. The text is
 * Markdown, as in the forum (code blocks, lists, links). A solution the
 * screen flags is kept hidden until a moderator decides, and the editor
 * says so rather than letting it look published.
 */
export function WriteupEditor({
  challengeId,
  initial,
}: {
  challengeId: string;
  initial: { content: string; isHidden: boolean } | null;
}): React.ReactElement {
  const router = useRouter();
  const [content, setContent] = useState(initial?.content ?? "");
  const [message, setMessage] = useState<{ tone: "ok" | "held" | "error"; text: string } | null>(
    initial?.isHidden === true
      ? {
          tone: "held",
          text: "Ta solution attend une relecture : personne d'autre ne la voit encore.",
        }
      : null,
  );
  const [pending, startTransition] = useTransition();

  const publish = (): void => {
    startTransition(async () => {
      const result = await publishWriteupAction({ challengeId, content });
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
      const result = await deleteWriteupAction(challengeId);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setContent("");
      setMessage({ tone: "ok", text: "Solution retirée." });
      router.refresh();
    });
  };

  const color =
    message?.tone === "error"
      ? "var(--color-danger)"
      : message?.tone === "held"
        ? "var(--color-warning)"
        : "var(--cosmetic-accent)";

  return (
    <div className="card" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
      <label
        htmlFor={`writeup-${challengeId}`}
        className="mono-label"
        style={{ color: "var(--color-text-muted)" }}
      >
        Ta solution {initial !== null ? "(publiée)" : ""}
      </label>
      <textarea
        id={`writeup-${challengeId}`}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
        }}
        rows={8}
        maxLength={10000}
        placeholder="Explique ta démarche : par où tu as commencé, ce qui a coincé, la commande ou le code qui a marché. Markdown accepté (```code```, listes, liens)."
        style={{
          width: "100%",
          resize: "vertical",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 1.6,
          padding: "10px 12px",
          background: "var(--color-bg-sunken, #05041A)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border-default)",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--accent btn--sm"
          onClick={publish}
          disabled={pending || content.trim().length === 0}
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
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {String(content.trim().length)} / 10 000
        </span>
      </div>
      <p aria-live="polite" style={{ margin: 0, fontSize: 13, color, minHeight: 18 }}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
