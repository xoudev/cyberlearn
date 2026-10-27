"use client";

import React, { useActionState } from "react";
import { AdminConfirmForm } from "../../../_components/admin-confirmation";
import { keepFormInput } from "@/lib/form-input";
import {
  resetUserProfileFieldAction,
  updateUserProfileAction,
  type ProfileActionState,
} from "../../../_actions/profile-actions";
import { Card } from "../../../_components/admin-ui";
import { USER_CARDS } from "../../_components/columns";

/**
 * What the account shows of itself, and the console's corrections to it.
 *
 * Two kinds of gesture. Editing the name, the handle and the bio, for a
 * learner who asks or a typo; and putting one field back to what nobody chose
 * (the handle for the name, a generated handle, no bio, no avatar), for
 * something that should not be there, without typing a replacement for
 * somebody. Each asks before it runs and says what it did.
 *
 * Client-side because of the confirmations and the results; the bounds are
 * checked again on the server.
 */

type ResetField = "displayName" | "username" | "bio" | "avatar";

export function ProfileForm({
  userId,
  displayName,
  username,
  bio,
  avatarLabel,
  avatarIsUpload,
  hasAvatar,
}: {
  userId: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  /** The avatar named for support (avatarLabel). */
  avatarLabel: string;
  /** A picture the learner uploaded: removing it removes the file too. */
  avatarIsUpload: boolean;
  hasAvatar: boolean;
}): React.ReactElement {
  const [saveState, saveAction, savePending] = useActionState<ProfileActionState, FormData>(
    updateUserProfileAction,
    {},
  );
  const [resetState, resetAction, resetPending] = useActionState<ProfileActionState, FormData>(
    resetUserProfileFieldAction,
    {},
  );

  const handle = username !== null ? `@${username}` : displayName;
  const confirmations: Record<ResetField, string> = {
    displayName: `Remplacer le nom affiché « ${displayName} » par le pseudo « ${username ?? ""} » ?`,
    username: `Remplacer le pseudo ${handle} par un pseudo neutre généré ? L'adresse de son profil public changera.`,
    bio: "Effacer la bio de ce compte ?",
    avatar: avatarIsUpload
      ? "Retirer l'avatar de ce compte ? La photo envoyée sera aussi supprimée du stockage."
      : "Retirer l'avatar de ce compte ?",
  };
  const resets: { field: ResetField; label: string; enabled: boolean }[] = [
    {
      field: "displayName",
      label: "Nom affiché → pseudo",
      enabled: username !== null && displayName !== username,
    },
    { field: "username", label: "Nouveau pseudo", enabled: username !== null },
    { field: "bio", label: "Effacer la bio", enabled: bio !== null },
    { field: "avatar", label: "Retirer l'avatar", enabled: hasAvatar },
  ];

  return (
    <Card title={USER_CARDS.profile} pad>
      <div className="a-defrow" style={{ padding: "0 0 12px" }}>
        <span className="a-defrow-label">Avatar</span>
        <span className="mono a-field-hint">{avatarLabel}</span>
      </div>

      {/* Remounted when the saved values change, so a field reset below
          shows here at once; a refusal changes nothing and keeps the typing. */}
      <AdminConfirmForm
        key={`${displayName}\u0000${username ?? ""}\u0000${bio ?? ""}`}
        action={saveAction}
        onReset={keepFormInput}
        question={`Enregistrer ces changements sur le profil de ${handle} ? Ils se voient partout où le compte apparaît.`}
        className="a-form"
      >
        <input type="hidden" name="userId" value={userId} />

        <label className="a-field">
          <span className="a-label">Nom affiché</span>
          <input
            name="displayName"
            required
            maxLength={64}
            defaultValue={displayName}
            className="a-input"
            autoComplete="off"
          />
        </label>

        <label className="a-field">
          <span className="a-label">
            Pseudo
            {username === null && <span className="a-label-optional"> · pas encore choisi</span>}
          </span>
          <input
            name="username"
            maxLength={32}
            defaultValue={username ?? ""}
            className="a-input"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="a-field-hint">
            Lettres minuscules, chiffres et tirets. Il donne l&apos;adresse du profil public
            (/u/pseudo) : en changer rompt les liens vers l&apos;ancien.
          </span>
        </label>

        <label className="a-field">
          <span className="a-label">
            Bio<span className="a-label-optional"> · optionnelle</span>
          </span>
          <textarea
            name="bio"
            maxLength={280}
            rows={3}
            defaultValue={bio ?? ""}
            className="a-textarea"
          />
        </label>

        <button type="submit" disabled={savePending} className="a-btn a-btn--ghost">
          {savePending ? "Enregistrement…" : "Enregistrer le profil"}
        </button>

        {saveState.error !== undefined && <p className="a-form-error">{saveState.error}</p>}
        {saveState.notice !== undefined && <p className="a-form-notice">{saveState.notice}</p>}
      </AdminConfirmForm>

      <div className="a-form" style={{ marginTop: 18 }}>
        <span className="a-label">Remettre à zéro</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {resets.map((reset) => (
            <AdminConfirmForm
              key={reset.field}
              action={resetAction}
              question={`${handle} : ${confirmations[reset.field]}`}
            >
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="field" value={reset.field} />
              <button
                type="submit"
                disabled={resetPending || !reset.enabled}
                className="a-btn a-btn--ghost a-btn--sm"
              >
                {reset.label}
              </button>
            </AdminConfirmForm>
          ))}
        </div>

        {resetState.error !== undefined && <p className="a-form-error">{resetState.error}</p>}
        {resetState.notice !== undefined && <p className="a-form-notice">{resetState.notice}</p>}
        {resetState.fileKept === true && (
          <p className="a-form-error">
            La photo n&apos;a pas pu être supprimée du stockage : le compte ne l&apos;affiche plus,
            mais le fichier reste à supprimer à la main dans le bucket « avatars » de Supabase.
          </p>
        )}
      </div>
    </Card>
  );
}
