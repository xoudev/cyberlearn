"use client";

// The action result and live bio length belong to the editable profile form.
import React, { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingActionState } from "../_actions/complete-onboarding";
import { AvatarView } from "@/components/avatar-view";

interface OnboardingFormProps {
  initialUsername: string;
  initialDisplayName: string;
  initialBio: string;
  avatarUrl: string | null;
}

const initialState: OnboardingActionState = { success: false };
const BIO_MAX = 280;

function Field({
  id,
  label,
  hint,
  prefix,
  children,
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  prefix?: string;
  children: React.ReactNode;
  error?: string | undefined;
}): React.ReactElement {
  return (
    <div className="ob-field">
      <div className="ob-field__head">
        <label htmlFor={id}>{label}</label>
        {hint && <span id={`${id}-hint`}>{hint}</span>}
      </div>
      <div className="ob-input-row" data-invalid={error ? "true" : undefined}>
        {prefix && (
          <span className="ob-input-prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        {children}
      </div>
      {error && (
        <p className="ob-field__error" role="alert" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function OnboardingForm({
  initialUsername,
  initialDisplayName,
  initialBio,
  avatarUrl,
}: OnboardingFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(completeOnboarding, initialState);
  const [bioLen, setBioLen] = useState(initialBio.length);
  const usernameError = state.errors?.username?.[0];
  const nameError = state.errors?.displayName?.[0];
  const bioError = state.errors?.bio?.[0];

  return (
    <div className="ob-profile">
      <h1 className="ob-shell__title">Comment doit-on t’appeler ?</h1>
      <p className="ob-shell__lede">Choisis le nom et le pseudo de ton profil.</p>
      {avatarUrl && (
        <AvatarView
          src={avatarUrl}
          name={initialDisplayName}
          className="ob-profile__avatar"
          glyphSize={32}
        />
      )}
      {state.message && (
        <p className="ob-error" role="alert">
          {state.message}
        </p>
      )}
      <form action={formAction} className="ob-form">
        <Field
          id="username"
          label="Identifiant"
          hint="3–32 · a-z 0-9 -"
          prefix="@"
          error={usernameError}
        >
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="mon-pseudo"
            minLength={3}
            maxLength={32}
            defaultValue={state.values?.username ?? initialUsername}
            aria-invalid={Boolean(usernameError)}
            aria-describedby={usernameError ? "username-hint username-error" : "username-hint"}
          />
        </Field>
        <Field id="displayName" label="Nom affiché" error={nameError}>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            autoComplete="name"
            defaultValue={state.values?.displayName ?? initialDisplayName}
            placeholder="Ton nom ou pseudo"
            maxLength={64}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "displayName-error" : undefined}
          />
        </Field>
        <Field id="bio" label="Bio" hint="Optionnelle" error={bioError}>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={BIO_MAX}
            defaultValue={state.values?.bio ?? initialBio}
            placeholder="Qui es-tu ? Qu’est-ce qui t’a amené ici ?"
            onChange={(event) => {
              setBioLen(event.target.value.length);
            }}
            aria-invalid={Boolean(bioError)}
            aria-describedby={bioError ? "bio-error bio-count" : "bio-count"}
          />
        </Field>
        <p
          id="bio-count"
          className="ob-counter"
          data-warning={bioLen > BIO_MAX * 0.85 ? "true" : undefined}
        >
          {bioLen} / {BIO_MAX}
        </p>
        <button className="btn btn--lg btn--block" type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Continuer"}
        </button>
      </form>
    </div>
  );
}
