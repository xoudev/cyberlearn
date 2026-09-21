"use client";

import React, { useState, useTransition } from "react";
// The notes renderer: a dependency-free markdown pass that builds React
// elements rather than HTML, so a forum post cannot carry markup. Shared with
// the notes rather than copied, since both render the same kind of text.
import { renderNoteMarkdown } from "@/lib/markdown/render-note";
import { editPostAction, hidePostAction } from "../_actions/forum-actions";
import { HELD_FOR_REVIEW } from "@/lib/moderation/held-notice";
import { Monogram, authorName, formatDate } from "./forum-bits";
import type { ForumPostView } from "@cyberlearn/db";

/**
 * One message, with the two things its author may do to it afterwards.
 *
 * A removed message is shown to its author, struck through and labelled,
 * instead of disappearing: a post that silently vanishes reads as a bug, and
 * the author is the one person entitled to know it was theirs that went.
 */
export function PostCard({
  post,
  avatarSrc,
  canEdit,
  canRemove,
  path,
  hidden = false,
}: {
  post: ForumPostView;
  /** Resolved on the server: an uploaded avatar's URL is signed and expires. */
  avatarSrc: string | null;
  canEdit: boolean;
  canRemove: boolean;
  path: string;
  hidden?: boolean;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [pending, start] = useTransition();

  const save = (): void => {
    setError(null);
    setHeld(false);
    start(() => {
      void editPostAction({ postId: post.id, content: draft, path }).then((res) => {
        if (res.ok) {
          setEditing(false);
          // The edit was saved and the post went down with it, so say so here:
          // the card is about to disappear from everyone else's thread.
          setHeld(res.heldForReview === true);
          return;
        }
        setError(res.error ?? "Modification impossible.");
      });
    });
  };

  const remove = (): void => {
    setError(null);
    start(() => {
      void hidePostAction({ postId: post.id, path }).then((res) => {
        if (!res.ok) setError(res.error ?? "Suppression impossible.");
      });
    });
  };

  return (
    <article className="fo-post" data-hidden={hidden}>
      <div className="fo-post-author">
        <Monogram author={post.author} src={avatarSrc} />
        <span className="fo-post-name">{authorName(post.author)}</span>
        {post.author?.role === "TEACHER" && <span className="fo-post-role">Professeur</span>}
        {post.author?.role === "ADMIN" && <span className="fo-post-role">Équipe</span>}
        {post.author && <span className="fo-post-level">niveau {post.author.level}</span>}
      </div>

      <div className="fo-post-body">
        <div className="fo-post-head">
          <span>
            {formatDate(post.createdAt)}
            {post.editedAt !== null && <span> · modifié</span>}
            {hidden && <span style={{ color: "#FF6B7A" }}> · retiré</span>}
          </span>
          {(canEdit || canRemove) && !hidden && (
            <span className="fo-post-tools">
              {canEdit && (
                <button
                  type="button"
                  className="fo-btn"
                  disabled={pending}
                  onClick={() => {
                    setDraft(post.content);
                    setEditing(!editing);
                  }}
                >
                  {editing ? "Annuler" : "Modifier"}
                </button>
              )}
              {canRemove && (
                <button
                  type="button"
                  className="fo-btn fo-btn--danger"
                  disabled={pending}
                  onClick={remove}
                >
                  Retirer
                </button>
              )}
            </span>
          )}
        </div>

        {editing ? (
          <>
            <textarea
              className="fo-textarea"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
              }}
              maxLength={10_000}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="fo-btn fo-btn--primary"
                onClick={save}
                disabled={pending}
              >
                {pending ? "…" : "Enregistrer"}
              </button>
            </div>
          </>
        ) : (
          <div className="note-md" style={hidden ? { opacity: 0.55 } : undefined}>
            {renderNoteMarkdown(post.content)}
          </div>
        )}

        {error !== null && (
          <p className="fo-error" role="alert" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}

        {held && (
          <p className="fo-held" role="status" style={{ marginTop: 10 }}>
            {HELD_FOR_REVIEW}
          </p>
        )}
      </div>
    </article>
  );
}
