"use client";

// Validation feedback and navigation depend on the reference typed in the browser.
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { INVALID_REFERENCE, verifyTarget } from "./verify-target";

export function VerifyForm(): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const ready = value.trim().length > 0;

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const target = verifyTarget(value);
    if (target === null) {
      setError(INVALID_REFERENCE);
      return;
    }
    setError("");
    router.push(target);
  }

  return (
    <form className="verification-form" onSubmit={handleSubmit}>
      <label htmlFor="cert-id">Numéro ou adresse du certificat</label>
      <input
        id="cert-id"
        type="text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        placeholder="CL-AAAA-XXXXXXXX"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "cert-reference-error" : "cert-reference-hint"}
      />
      {error ? (
        <p id="cert-reference-error" className="verification-error" role="alert">
          {error}
        </p>
      ) : (
        <p id="cert-reference-hint" className="verification-hint">
          Numéro en haut à droite du certificat · adresse en bas
        </p>
      )}
      <button className="btn" type="submit" disabled={!ready}>
        Vérifier le certificat
      </button>
      <Link href="/" className="verification-back">
        Retour à l’accueil
      </Link>
    </form>
  );
}
