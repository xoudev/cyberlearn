"use client";

// "use client" justified: clipboard API + copied state

import React, { useState } from "react";

interface Props {
  text: string;
}

export function CopyButton({ text }: Props): React.ReactElement {
  const [copied, setCopied] = useState(false);

  function handleCopy(): void {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      globalThis.setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: "4px 10px",
        background: "transparent",
        border: `1px solid ${copied ? "rgba(10,255,212,0.4)" : "rgba(10,255,212,0.2)"}`,
        color: copied ? "#0AFFD4" : "#6B6890",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        flexShrink: 0,
        transition: "color 200ms ease, border-color 200ms ease",
      }}
    >
      {copied ? "✓ copié" : "copier"}
    </button>
  );
}
