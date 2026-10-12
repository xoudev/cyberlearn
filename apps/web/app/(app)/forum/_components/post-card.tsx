"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
// The notes renderer: a dependency-free markdown pass that builds React
// elements rather than HTML, so a forum post cannot carry markup. Shared with
// the notes rather than copied, since both render the same kind of text.
import { renderNoteMarkdown } from "@/lib/markdown/render-note";
import { editPostAction, hidePostAction } from "../_actions/forum-actions";
import { HELD_FOR_REVIEW } from "@/lib/moderation/held-notice";
import { ConfirmButton } from "@/components/confirm-button";
import { FriendMark } from "@/components/friend-mark";
import { Monogram, authorName, formatDate } from "./forum-bits";
import type { ForumPostView } from "@cyberlearn/db";

/**
 * One message, with the two things its author may do to it afterwards.
 *
 * A removed message is shown to its author, struck through and labelled,
 * instead of disappearing: a post that silently vanishes reads as a bug, and
 * the author is the one person entitled to know it was theirs that went.
 * Removing asks first, in place, as the app does: it cannot be taken back
 * from here.
 */
export function PostCard({
  post,
  avatarSrc,
  profileHref,
  canEdit,
  canRemove,
  path,
  hidden = false,
  isFriend = false,
}: {
  post: ForumPostView;
  /** Resolved on the server: an uploaded avatar's URL is signed and expires. */
  avatarSrc: string | null;
  /** The author's profile, or null when the reader would not be let in. */
  profileHref: string | null;
  /** The author is one of the reader's friends: a forum post is always signed. */
  isFriend?: boolean;
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

  // Awaited inside the transition, so `pending` covers the call itself and the
  // buttons stay held until it answers; a call that throws is said like a
  // refusal rather than lost as an unhandled rejection.
  const save = (): void => {
    setError(null);
    setHeld(false);
    start(async () => {
      try {
        const res = await editPostAction({ postId: post.id, content: draft, path });
        if (res.ok) {
          setEditing(false);
          // The edit was saved and the post went down with it, so say so here:
          // the card is about to disappear from everyone else's thread.
          setHeld(res.heldForReview === true);
          return;
        }
        setError(res.error ?? "Modification impossible.");
      } catch {
        setError("Modification impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  const remove = (): void => {
    setError(null);
    start(async () => {
      try {
        const res = await hidePostAction({ postId: post.id, path });
        if (!res.ok) setError(res.error ?? "Suppression impossible.");
      } catch {
        setError("Suppression impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  return (
    <article className="fo-post" data-hidden={hidden}>
      <div className="fo-post-author">
        <Monogram author={post.author} src={avatarSrc} />
        <span className="fo-post-who">
          {profileHref !== null ? (
            <Link href={profileHref} className="fo-post-name">
              {authorName(post.author)}
            </Link>
          ) : (
            <span className="fo-post-name">{authorName(post.author)}</span>
          )}
          {isFriend && <FriendMark />}
        </span>
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
                  className="btn btn--ghost btn--sm"
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
                <ConfirmButton
                  className="btn btn--danger btn--ghost btn--sm"
                  pending={pending}
                  question="Retirer ce message ?"
                  confirmLabel="Retirer"
                  onConfirm={remove}
                >
                  Retirer
                </ConfirmButton>
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
                className="btn btn--accent btn--sm"
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
