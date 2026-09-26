"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function VerifyForm(): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const ready = value.trim().length > 0;

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
    e.preventDefault();
    const id = value.trim().replace(/^#/, "");
    if (!UUID_RE.test(id)) {
      setError("Identifiant invalide. Attendu : un identifiant unique (UUID).");
      return;
    }
    setError("");
    router.push(`/verify/${id}`);
  }

  const borderColor = error ? "#FF4757" : focused ? "#0AFFD4" : "#2A2560";

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label
          htmlFor="cert-id"
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#7F7BA9",
            marginBottom: 10,
          }}
        >
          Identifiant du certificat
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#05041A",
            border: `1px solid ${borderColor}`,
            boxShadow: focused ? "0 0 0 1px rgba(10,255,212,0.25)" : "none",
            transition: "border-color 160ms ease, box-shadow 160ms ease",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              padding: "0 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: error ? "#FF4757" : "#0AFFD4",
            }}
          >
            #
          </span>
          <input
            id="cert-id"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
            }}
            placeholder="0f8a1c2e-3b4d-5e6f-7a8b-9c0d1e2f3a4b"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              padding: "13px 14px 13px 0",
              color: "#F5F5FA",
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.02em",
              outline: "none",
            }}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? "true" : undefined}
          />
        </div>

        {error ? (
          <p
            style={{ color: "#FF4757", fontSize: 12, marginTop: 8, fontFamily: "var(--font-mono)" }}
          >
            {error}
          </p>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#44406B",
              marginTop: 8,
            }}
          >
            Identifiant unique · visible en bas de chaque certificat
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!ready}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "14px 20px",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          border: "none",
          color: ready ? "#05041A" : "#7F7BA9",
          background: ready ? "linear-gradient(90deg, #0AFFD4, #4DFFE0)" : "#15122A",
          boxShadow: ready ? "0 0 24px rgba(10,255,212,0.28)" : "none",
          cursor: ready ? "pointer" : "not-allowed",
          transition: "background 180ms ease, box-shadow 180ms ease",
        }}
      >
        Vérifier <span aria-hidden="true">→</span>
      </button>

      <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 18 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7F7BA9",
            textDecoration: "none",
          }}
        >
          <span aria-hidden="true">←</span> Retour à l&apos;accueil
        </Link>
      </div>
    </form>
  );
}
