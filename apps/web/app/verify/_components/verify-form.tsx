"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { INVALID_REFERENCE, verifyTarget } from "./verify-target";

export function VerifyForm(): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const ready = value.trim().length > 0;

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
    e.preventDefault();
    const target = verifyTarget(value);
    if (target === null) {
      setError(INVALID_REFERENCE);
      return;
    }
    setError("");
    router.push(target);
  }

  const borderColor = error
    ? "var(--color-category-cybersec)"
    : focused
      ? "var(--color-brand-turquoise)"
      : "var(--color-border-default)";

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label
          className="mono-label"
          htmlFor="cert-id"
          style={{
            display: "block",
            color: "var(--color-text-muted)",
            marginBottom: 10,
          }}
        >
          Numéro ou adresse du certificat
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--color-bg-sunken)",
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
              color: error ? "var(--color-category-cybersec)" : "var(--color-brand-turquoise)",
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
            placeholder="CL-2026-0F8A1C2E"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              padding: "13px 14px 13px 0",
              color: "var(--color-text-primary)",
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
            style={{
              color: "var(--color-category-cybersec)",
              fontSize: 12,
              marginTop: 8,
              fontFamily: "var(--font-mono)",
            }}
          >
            {error}
          </p>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-text-faint)",
              marginTop: 8,
            }}
          >
            Numéro en haut à droite du certificat · adresse en bas
          </p>
        )}
      </div>

      <button
        className="mono-label mono-label--md"
        type="submit"
        disabled={!ready}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "14px 20px",
          fontWeight: 700,
          border: "none",
          color: ready ? "var(--color-bg-sunken)" : "var(--color-text-muted)",
          background: ready
            ? "linear-gradient(90deg, var(--color-brand-turquoise), #4DFFE0)"
            : "#15122A",
          boxShadow: ready ? "0 0 24px rgba(10,255,212,0.28)" : "none",
          cursor: ready ? "pointer" : "not-allowed",
          transition: "background 180ms ease, box-shadow 180ms ease",
        }}
      >
        Vérifier <span aria-hidden="true">→</span>
      </button>

      <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: 18 }}>
        <Link
          className="mono-label mono-label--md"
          href="/"
          style={{
            color: "var(--color-text-muted)",
            textDecoration: "none",
          }}
        >
          <span aria-hidden="true">←</span> Retour à l&apos;accueil
        </Link>
      </div>
    </form>
  );
}
