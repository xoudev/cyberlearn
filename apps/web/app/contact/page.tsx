"use client";

import React, { useActionState, useEffect, useState } from "react";
import { submitContactAction, type ContactFormState } from "./_actions/contact-actions";

const THEMES = [
  { value: "BUG", label: "Bug" },
  { value: "QUESTION", label: "Question" },
  { value: "FEATURE_REQUEST", label: "Suggestion" },
  { value: "SECURITY", label: "Sécurité" },
  { value: "CONTENT_ERROR", label: "Erreur de contenu" },
  { value: "OTHER", label: "Autre" },
] as const;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(5,4,26,0.8)",
  border: "1px solid #2A2560",
  color: "#F5F5FA",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const initialState: ContactFormState = {};

export default function ContactPage(): React.ReactElement {
  const [state, action, isPending] = useActionState(submitContactAction, initialState);
  // Error screens link here with ?ref=<incident digest>; prefill the report.
  const [incidentRef, setIncidentRef] = useState<string | null>(null);
  useEffect(() => {
    setIncidentRef(new URLSearchParams(window.location.search).get("ref"));
  }, []);

  if (state.success) {
    return (
      <div
        style={{ maxWidth: 640, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}
        className="contact-success"
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 20px",
            background: "rgba(10,255,212,0.1)",
            border: "1px solid rgba(10,255,212,0.3)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0AFFD4"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 24,
            color: "#F5F5FA",
            margin: "0 0 10px",
          }}
        >
          Message envoyé
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#6B6890",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Ton message a été reçu. Notre équipe te répondra dans les plus brefs délais.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}
      className="contact-wrapper"
    >
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span style={{ width: 16, height: 1, background: "#0AFFD4", display: "inline-block" }} />
          Support
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 30,
            color: "#F5F5FA",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Nous contacter
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
          Un bug, une suggestion ou une question ? On te répond.
        </p>
      </div>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Email */}
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B6890",
              marginBottom: 6,
            }}
          >
            Email *
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ton@email.com"
            style={INPUT_STYLE}
          />
          {state.fieldErrors?.email && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FF4757",
                margin: "4px 0 0",
              }}
            >
              {state.fieldErrors.email}
            </p>
          )}
        </div>

        {/* Theme */}
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B6890",
              marginBottom: 6,
            }}
          >
            Thème *
          </label>
          <select
            name="theme"
            required
            defaultValue=""
            style={{ ...INPUT_STYLE, appearance: "none" }}
          >
            <option value="" disabled>
              Choisir un thème…
            </option>
            {THEMES.map((t) => (
              <option key={t.value} value={t.value} style={{ background: "#0A0826" }}>
                {t.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.theme && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FF4757",
                margin: "4px 0 0",
              }}
            >
              {state.fieldErrors.theme}
            </p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B6890",
              marginBottom: 6,
            }}
          >
            Sujet *
          </label>
          <input
            key={incidentRef ?? "subject"}
            name="subject"
            type="text"
            required
            minLength={5}
            maxLength={200}
            defaultValue={incidentRef ? `Incident ${incidentRef}` : undefined}
            placeholder="Résume ton problème en quelques mots"
            style={INPUT_STYLE}
          />
          {state.fieldErrors?.subject && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FF4757",
                margin: "4px 0 0",
              }}
            >
              {state.fieldErrors.subject}
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B6890",
              marginBottom: 6,
            }}
          >
            Message *
          </label>
          <textarea
            name="message"
            required
            minLength={20}
            maxLength={5000}
            rows={7}
            placeholder="Décris ta demande en détail…"
            style={{ ...INPUT_STYLE, resize: "vertical" }}
          />
          {state.fieldErrors?.message && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FF4757",
                margin: "4px 0 0",
              }}
            >
              {state.fieldErrors.message}
            </p>
          )}
        </div>

        {state.error && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#FF4757",
              margin: 0,
              padding: "12px 14px",
              background: "rgba(255,71,87,0.07)",
              border: "1px solid rgba(255,71,87,0.3)",
            }}
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "14px 28px",
            background: "#0024FF",
            border: "1px solid #0024FF",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
            boxShadow: "0 0 20px rgba(0,36,255,0.35)",
            alignSelf: "flex-start",
          }}
        >
          {isPending ? "Envoi en cours…" : "Envoyer le message"}
        </button>
      </form>
    </div>
  );
}
