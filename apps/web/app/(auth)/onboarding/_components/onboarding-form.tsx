"use client";

import React, { useState, useActionState } from "react";
import { completeOnboarding } from "../_actions/complete-onboarding";
import type { OnboardingActionState } from "../_actions/complete-onboarding";

interface OnboardingFormProps {
  initialDisplayName: string;
  avatarUrl: string | null;
}

const initialState: OnboardingActionState = { success: false };

function CornerBrackets(): React.ReactElement {
  const s: React.CSSProperties = {
    position: "absolute",
    width: 14,
    height: 14,
    border: "1.5px solid #0AFFD4",
  };
  return (
    <span style={{ position: "absolute", inset: 8, pointerEvents: "none" }} aria-hidden="true">
      <span style={{ ...s, top: 0, left: 0, borderRight: "none", borderBottom: "none" }} />
      <span style={{ ...s, top: 0, right: 0, borderLeft: "none", borderBottom: "none" }} />
      <span style={{ ...s, bottom: 0, left: 0, borderRight: "none", borderTop: "none" }} />
      <span style={{ ...s, bottom: 0, right: 0, borderLeft: "none", borderTop: "none" }} />
    </span>
  );
}

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
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#0AFFD4",
          marginBottom: 10,
        }}
      >
        <label htmlFor={id}>
          <span style={{ marginRight: 4 }}>›</span> {label}
        </label>
        {hint && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6F6B99",
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
          background: "#05041A",
          border: `1px solid ${error ? "rgba(255,71,87,0.6)" : "#2A2560"}`,
          transition: "border-color 180ms ease, box-shadow 180ms ease",
        }}
        onFocusCapture={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "#0AFFD4";
          el.style.boxShadow = "0 0 0 1px rgba(10,255,212,0.3), 0 0 14px rgba(10,255,212,0.12)";
          el.style.background = "#06052A";
        }}
        onBlurCapture={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = error ? "rgba(255,71,87,0.6)" : "#2A2560";
          el.style.boxShadow = "none";
          el.style.background = "#05041A";
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
              color: "#6F6B99",
              borderRight: "1px solid #1F1B47",
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
            color: "#FF4757",
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
  color: "#F5F5FA",
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
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 640,
        padding: "32px 36px 28px",
        background: "rgba(10,8,38,0.85)",
        border: "1px solid #2A2560",
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
      <CornerBrackets />

      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          marginBottom: 26,
          borderBottom: "1px solid #1F1B47",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          <b style={{ color: "#0AFFD4", fontWeight: 700 }}>›</b> CRÉER TON IDENTITÉ
        </h2>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6F6B99",
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
                border: "1px solid #2A2560",
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
              color: "#FF4757",
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
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 14px",
                borderLeft: "1px solid #1F1B47",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "#6F6B99",
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
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#0AFFD4",
                marginBottom: 10,
              }}
            >
              <label htmlFor="bio">
                <span style={{ marginRight: 4 }}>›</span> Bio
              </label>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6F6B99",
                  fontWeight: 500,
                }}
              >
                OPTIONNEL
              </span>
            </div>
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: "#05041A",
                border: "1px solid #2A2560",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
              }}
              onFocusCapture={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "#0AFFD4";
                el.style.boxShadow =
                  "0 0 0 1px rgba(10,255,212,0.3), 0 0 14px rgba(10,255,212,0.12)";
                el.style.background = "#06052A";
              }}
              onBlurCapture={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "#2A2560";
                el.style.boxShadow = "none";
                el.style.background = "#05041A";
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
                  color: "#F5F5FA",
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
                  borderTop: "1px solid #1F1B47",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6F6B99",
                  letterSpacing: "0.08em",
                }}
              >
                <span style={{ color: bioLen > BIO_MAX * 0.85 ? "#FFB020" : "#6F6B99" }}>
                  {bioLen} / {BIO_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                height: 52,
                padding: "0 20px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: isPending ? "not-allowed" : "pointer",
                border: "1px solid #0024FF",
                background: "#0024FF",
                color: "#FFFFFF",
                opacity: isPending ? 0.5 : 1,
                boxShadow: "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
                transition: "background 180ms ease, box-shadow 180ms ease",
              }}
              onMouseEnter={(e) => {
                if (isPending) return;
                e.currentTarget.style.background = "#1F3BFF";
                e.currentTarget.style.boxShadow =
                  "0 0 32px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0024FF";
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
