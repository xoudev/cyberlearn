"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import type { ContentGesture, ContentSurface } from "@cyberlearn/db";
import { contentGestureQuestion } from "@/lib/content-moderation";
import {
  dismissContentReportsAction,
  moderateContentAction,
  type ContentActionState,
} from "../_actions/content-actions";

/**
 * What can be done to one piece of published content, from its row in the
 * list or its card in the reports: hide it or show it again, delete it, and
 * on a report, close it and leave the content as it is.
 *
 * A client component for the forms' pending and refused states, and for the
 * question each gesture asks first: every one reaches the author, and a
 * deletion takes what goes with the content (a thread, a question's answers).
 * Content the filter's queue still holds is decided there: the row says so
 * and leads to it, rather than offering a gesture the queue would undo. A
 * forum message its author withdrew is not offered « Réafficher »: that
 * withdrawal is final, and only a deletion is left.
 */
export function ContentActions({
  surface,
  contentId,
  hidden,
  pendingReview,
  authorWithdrew = false,
  opensThread,
  replies,
  withDismiss = false,
  dismissOnly = false,
}: {
  surface: ContentSurface;
  contentId: string;
  hidden: boolean;
  pendingReview: boolean;
  /** Hidden by its author, not by the moderation: never shown again from here. */
  authorWithdrew?: boolean;
  opensThread: boolean;
  replies: number;
  /** On a report: « Classer sans suite » closes the reports and keeps the content. */
  withDismiss?: boolean;
  /** The content is gone: its reports can only be closed. */
  dismissOnly?: boolean;
}): React.ReactElement {
  const [state, action, pending] = useActionState<ContentActionState, FormData>(
    runContentAction,
    {},
  );
  const subject = { surface, opensThread, replies };

  const gestureForm = (
    gesture: ContentGesture,
    label: string,
    tone: string,
  ): React.ReactElement => (
    <form
      action={action}
      onSubmit={(event) => {
        // Cancelling the native submit also cancels the action: React only
        // runs a form's action for a submit nobody prevented.
        if (!window.confirm(contentGestureQuestion(gesture, subject))) event.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value="gesture" />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="gesture" value={gesture} />
      <button type="submit" disabled={pending} className={`a-btn a-btn--sm ${tone}`}>
        {label}
      </button>
    </form>
  );

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 180 }}>
      {pendingReview ? (
        <span className="a-field-hint">
          En attente dans la{" "}
          <Link href="/moderation" style={{ color: "var(--a-accent)" }}>
            file de relecture
          </Link>{" "}
          du filtre : c&apos;est là qu&apos;il se décide.
        </span>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!dismissOnly &&
            (!hidden
              ? gestureForm("hide", "Masquer", "a-btn--ghost")
              : authorWithdrew
                ? null
                : gestureForm("restore", "Réafficher", "a-btn--ghost"))}
          {!dismissOnly && gestureForm("delete", "Supprimer", "a-btn--danger")}
          {(withDismiss || dismissOnly) && (
            <form action={action}>
              <input type="hidden" name="intent" value="dismiss" />
              <input type="hidden" name="surface" value={surface} />
              <input type="hidden" name="contentId" value={contentId} />
              <button type="submit" disabled={pending} className="a-btn a-btn--ghost a-btn--sm">
                Classer sans suite
              </button>
            </form>
          )}
        </div>
      )}
      {!pendingReview && !dismissOnly && hidden && authorWithdrew && (
        <span className="a-field-hint">
          Retiré par son auteur : il ne se réaffiche pas d&apos;ici.
        </span>
      )}
      {state.error !== undefined && (
        <p className="a-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message !== undefined && (
        <p className="a-field-hint" role="status">
          {state.message}
        </p>
      )}
    </div>
  );
}

/** Sends each form to its own action; both report into the one outcome above. */
function runContentAction(
  prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  return formData.get("intent") === "dismiss"
    ? dismissContentReportsAction(prev, formData)
    : moderateContentAction(prev, formData);
}
