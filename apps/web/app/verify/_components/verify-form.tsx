"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function VerifyForm(): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = value.trim();
    if (!UUID_RE.test(id)) {
      setError("Identifiant invalide. Format attendu : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
      return;
    }
    setError("");
    router.push(`/verify/${id}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label
            htmlFor="cert-id"
            style={{ display: "block", color: "#B8B5D1", fontSize: 13, marginBottom: 8 }}
          >
            Identifiant du certificat
          </label>
          <input
            id="cert-id"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            style={{
              width: "100%",
              background: "#110F33",
              border: `1px solid ${error ? "#ff4d4d" : "#2A2560"}`,
              borderRadius: 8,
              padding: "10px 14px",
              color: "#F5F5FA",
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              outline: "none",
              boxSizing: "border-box",
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {error && <p style={{ color: "#ff4d4d", fontSize: 12, marginTop: 6 }}>{error}</p>}
        </div>

        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            background: value.trim() ? "#0024FF" : "#1F1B47",
            color: value.trim() ? "#F5F5FA" : "#6B6890",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: value.trim() ? "pointer" : "not-allowed",
            transition: "background 200ms ease",
          }}
        >
          Vérifier
        </button>
      </form>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #1F1B47" }}>
        <Link href="/" style={{ color: "#4D8BFF", fontSize: 13, textDecoration: "none" }}>
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </>
  );
}
