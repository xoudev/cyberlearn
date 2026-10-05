"use client";

import React, { useState, useActionState } from "react";
import { completeOnboarding } from "../_actions/complete-onboarding";
import type { OnboardingActionState } from "../_actions/complete-onboarding";
import { CornerBrackets } from "@/app/_components/corner-brackets";

interface OnboardingFormProps {
  initialDisplayName: string;
  avatarUrl: string | null;
}

const initialState: OnboardingActionState = { success: false };

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
    <div style={{ display: "block", marginBottom: 18 }}>
      <div
        className="mono-label"
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontWeight: 600,
          color: "var(--color-brand-turquoise)",
          marginBottom: 10,
        }}
      >
        <label htmlFor={id}>
          <span style={{ marginRight: 4 }}>›</span> {label}
        </label>
        {hint && (
          <span
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              fontWeight: 500,
            }}
          >
            {hint}
          </span>
        )}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          background: "var(--color-bg-sunken)",
          border: `1px solid ${error ? "rgba(255,71,87,0.6)" : "var(--color-border-default)"}`,
          transition: "border-color 180ms ease, box-shadow 180ms ease",
        }}
        onFocusCapture={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "var(--color-brand-turquoise)";
          el.style.boxShadow = "0 0 0 1px rgba(10,255,212,0.3), 0 0 14px rgba(10,255,212,0.12)";
          el.style.background = "#06052A";
        }}
        onBlurCapture={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = error ? "rgba(255,71,87,0.6)" : "var(--color-border-default)";
          el.style.boxShadow = "none";
          el.style.background = "var(--color-bg-sunken)";
        }}
      >
        {prefix && (
          <span
            style={{
              display: "grid",
              placeItems: "center",
              padding: "0 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: "var(--color-text-muted)",
              borderRight: "1px solid var(--color-border-subtle)",
              background: "rgba(5,4,26,0.6)",
              flexShrink: 0,
            }}
          >
            {prefix}
          </span>
        )}
        {children}
      </div>

      {error && (
        <p
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-category-cybersec)",
            letterSpacing: "0.04em",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 48,
  padding: "0 14px",
  background: "transparent",
  border: 0,
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  letterSpacing: "0.01em",
  outline: "none",
};

export function OnboardingForm({
  initialDisplayName,
  avatarUrl,
}: OnboardingFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(completeOnboarding, initialState);
  const [bioLen, setBioLen] = useState(0);
  const BIO_MAX = 280;

  return (
    <div
      className="card"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 640,
        padding: "32px 36px 28px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -1,
          zIndex: -1,
          background:
            "linear-gradient(135deg, rgba(10,255,212,0.35), rgba(0,36,255,0.25) 50%, transparent 100%)",
          filter: "blur(16px)",
          opacity: 0.55,
        }}
      />
      <CornerBrackets inset={8} thickness={1.5} />

      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          marginBottom: 26,
          borderBottom: "1px solid var(--color-border-subtle)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h2
          className="mono-label mono-label--md"
          style={{
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          <b style={{ color: "var(--color-brand-turquoise)", fontWeight: 700 }}>›</b> CRÉER TON
          IDENTITÉ
        </h2>
        <span
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
          }}
        >
          INIT
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {avatarUrl && !avatarUrl.startsWith("__glyph:") && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                border: "1px solid var(--color-border-default)",
                clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
              }}
            />
          </div>
        )}

        {state.message && (
          <div
            role="alert"
            style={{
              marginBottom: 18,
              padding: "10px 14px",
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.4)",
              color: "var(--color-category-cybersec)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            {state.message}
          </div>
        )}

        <form action={formAction}>
          {/* Username */}
          <Field
            id="username"
            label="Identifiant"
            hint="3–32 · a-z 0-9 -"
            prefix="@"
            error={state.errors?.username?.[0]}
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
              style={INPUT_STYLE}
            />
            <span
              className="mono-label"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 14px",
                borderLeft: "1px solid var(--color-border-subtle)",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              ◌ En attente
            </span>
          </Field>

          {/* Display name */}
          <Field id="displayName" label="Nom affiché" error={state.errors?.displayName?.[0]}>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              autoComplete="name"
              defaultValue={initialDisplayName}
              placeholder="Ton nom ou pseudo"
              maxLength={64}
              style={INPUT_STYLE}
            />
          </Field>

          {/* Bio */}
          <div style={{ display: "block", marginBottom: 18 }}>
            <div
              className="mono-label"
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                fontWeight: 600,
                color: "var(--color-brand-turquoise)",
                marginBottom: 10,
              }}
            >
              <label htmlFor="bio">
                <span style={{ marginRight: 4 }}>›</span> Bio
              </label>
              <span
                className="mono-label"
                style={{
                  color: "var(--color-text-muted)",
                  fontWeight: 500,
                }}
              >
                OPTIONNEL
              </span>
            </div>
            <div
              className="card"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
              }}
              onFocusCapture={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "var(--color-brand-turquoise)";
                el.style.boxShadow =
                  "0 0 0 1px rgba(10,255,212,0.3), 0 0 14px rgba(10,255,212,0.12)";
                el.style.background = "#06052A";
              }}
              onBlurCapture={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "var(--color-border-default)";
                el.style.boxShadow = "none";
                el.style.background = "var(--color-bg-sunken)";
              }}
            >
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={BIO_MAX}
                placeholder="Qui es-tu ? Qu'est-ce qui t'a amené ici ?"
                onChange={(e) => {
                  setBioLen(e.target.value.length);
                }}
                style={{
                  padding: "12px 14px",
                  background: "transparent",
                  border: 0,
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  resize: "vertical",
                  outline: "none",
                  minHeight: 96,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "6px 14px",
                  borderTop: "1px solid var(--color-border-subtle)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                }}
              >
                <span
                  style={{
                    color:
                      bioLen > BIO_MAX * 0.85 ? "var(--color-warning)" : "var(--color-text-muted)",
                  }}
                >
                  {bioLen} / {BIO_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              className="btn btn--lg"
              type="submit"
              disabled={isPending}
              style={{
                flex: 1,
                opacity: isPending ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (isPending) return;
                e.currentTarget.style.background = "#1F3BFF";
                e.currentTarget.style.boxShadow =
                  "0 0 32px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-brand-blue)";
                e.currentTarget.style.boxShadow =
                  "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)";
              }}
            >
              {isPending ? (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                <>
                  Continuer <span style={{ fontSize: 16 }}>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
