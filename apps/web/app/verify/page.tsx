import React from "react";
import type { Metadata } from "next";
import { VerifyForm } from "./_components/verify-form";

export const metadata: Metadata = {
  title: "Vérifier un certificat",
  description: "Vérifiez l'authenticité d'un certificat Cyber Learn.",
};

export default function VerifyPage(): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030219",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#0A0826",
          border: "1px solid #1F1B47",
          borderRadius: 12,
          padding: "40px 32px",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "rgba(10,255,212,0.08)",
            border: "1px solid rgba(10,255,212,0.2)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0AFFD4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h1 style={{ color: "#F5F5FA", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Vérifier un certificat
        </h1>
        <p style={{ color: "#B8B5D1", fontSize: 14, marginBottom: 32 }}>
          Entrez l&apos;identifiant unique du certificat pour vérifier son authenticité.
        </p>

        <VerifyForm />
      </div>
    </div>
  );
}
