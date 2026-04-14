"use client";

import { useActionState } from "react";
import { completeOnboarding } from "../_actions/complete-onboarding";
import type { OnboardingActionState } from "../_actions/complete-onboarding";

interface OnboardingFormProps {
  initialDisplayName: string;
  avatarUrl: string | null;
}

const initialState: OnboardingActionState = { success: false };

export function OnboardingForm({ initialDisplayName, avatarUrl }: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(completeOnboarding, initialState);

  return (
    <div
      className="rounded-xl p-8 space-y-6"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      {/* Avatar preview (read-only in Phase 1 — upload in Phase 2) */}
      {avatarUrl && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover"
            style={{ border: "2px solid var(--color-border-default)" }}
          />
        </div>
      )}

      {state.message && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(255,77,109,0.1)",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
          }}
          role="alert"
        >
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Nom d&apos;utilisateur <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="mon-pseudo"
            minLength={3}
            maxLength={32}
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--color-bg-base)",
              border: `1px solid ${state.errors?.username ? "var(--color-danger)" : "var(--color-border-default)"}`,
              color: "var(--color-text-primary)",
            }}
          />
          {state.errors?.username && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              {state.errors.username[0]}
            </p>
          )}
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            3 à 32 caractères, lettres minuscules, chiffres et tirets uniquement.
          </p>
        </div>

        {/* Display name */}
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Nom affiché <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            autoComplete="name"
            defaultValue={initialDisplayName}
            placeholder="Votre nom"
            maxLength={64}
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--color-bg-base)",
              border: `1px solid ${state.errors?.displayName ? "var(--color-danger)" : "var(--color-border-default)"}`,
              color: "var(--color-text-primary)",
            }}
          />
          {state.errors?.displayName && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
              {state.errors.displayName[0]}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {/* Continue to placement test */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand-blue)", color: "#ffffff" }}
          >
            {isPending ? "Enregistrement…" : "Continuer → Test de placement (optionnel)"}
          </button>

          {/* Skip placement test */}
          <button
            type="submit"
            name="skipPlacementTest"
            value="true"
            disabled={isPending}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: "transparent",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
            }}
          >
            Passer directement au tableau de bord
          </button>
        </div>
      </form>
    </div>
  );
}
