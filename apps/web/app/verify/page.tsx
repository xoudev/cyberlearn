import React from "react";
import type { Metadata } from "next";
import { VerifyForm } from "./_components/verify-form";
import { Crumb } from "@/components/crumb";

export const metadata: Metadata = {
  title: "Vérifier un certificat",
  description: "Vérifiez l'authenticité d'un certificat Cyber Learn.",
};

const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

/** One bracket corner of the framed card. */
function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }): React.JSX.Element {
  const vertical = pos.startsWith("t") ? { top: -1 } : { bottom: -1 };
  const horizontal = pos.endsWith("l") ? { left: -1 } : { right: -1 };
  const widths =
    pos === "tl"
      ? { borderTopWidth: 2, borderLeftWidth: 2 }
      : pos === "tr"
        ? { borderTopWidth: 2, borderRightWidth: 2 }
        : pos === "bl"
          ? { borderBottomWidth: 2, borderLeftWidth: 2 }
          : { borderBottomWidth: 2, borderRightWidth: 2 };
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 22,
        height: 22,
        ...vertical,
        ...horizontal,
        borderColor: "#0AFFD4",
        borderStyle: "solid",
        borderWidth: 0,
        ...widths,
        pointerEvents: "none",
      }}
    />
  );
}

function LiveDot(): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#0AFFD4",
        boxShadow: "0 0 8px #0AFFD4",
        flexShrink: 0,
      }}
    />
  );
}

export default function VerifyPage(): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030219",
        backgroundImage:
          "linear-gradient(rgba(42,37,96,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(42,37,96,0.25) 1px, transparent 1px)",
        backgroundSize: "38px 38px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "clamp(24px, 6vw, 56px) 20px",
      }}
    >
      {/* Terminal breadcrumb */}
      <Crumb segments={["verify"]} />

      {/* Framed card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          background: "rgba(10,8,38,0.55)",
          border: "1px solid #1F1B47",
          padding: "clamp(28px, 5vw, 44px)",
        }}
      >
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />

        {/* Hexagon shield */}
        <div style={{ display: "grid", placeItems: "center", marginBottom: 26 }}>
          <div
            style={{
              position: "relative",
              width: 76,
              height: 84,
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, #0024FF, #0AFFD4)",
                clipPath: HEX,
              }}
            />
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: 3, background: "#0A0826", clipPath: HEX }}
            />
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0AFFD4"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "relative" }}
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
        </div>

        {/* Eyebrow */}
        <div
          className="mono-label"
          style={{
            color: "#7F7BA9",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span aria-hidden="true" style={{ width: 18, height: 1, background: "#2A2560" }} />
          {"// "}cert.verify
        </div>

        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: "clamp(28px, 4.5vw, 38px)",
            letterSpacing: "-0.03em",
            color: "#F5F5FA",
            lineHeight: 1.05,
            margin: "0 0 12px",
          }}
        >
          Vérifier un{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #0024FF, #4D8BFF 55%, #0AFFD4)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            certificat
          </span>
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14.5,
            color: "#B8B5D1",
            lineHeight: 1.55,
            margin: "0 0 28px",
            maxWidth: "44ch",
          }}
        >
          Entre l&apos;identifiant unique du certificat pour confirmer son authenticité et sa
          signature SHA-256.
        </p>

        <VerifyForm />
      </div>

      {/* Footer badges */}
      <div
        className="mono-label"
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px 16px",
          color: "#44406B",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <LiveDot /> Signé SHA-256
        </span>
        <span style={{ color: "#2A2560" }}>/</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <LiveDot /> Registre public
        </span>
        <span style={{ color: "#2A2560" }}>/</span>
        <span style={{ color: "#7F7BA9" }}>cyberlearn.fr/verify</span>
      </div>
    </div>
  );
}
