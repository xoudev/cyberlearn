"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type mermaidLib from "mermaid";
type MermaidAPI = typeof mermaidLib;

// Mermaid is imported dynamically inside useEffect so it is never evaluated
// during SSR: mermaid accesses browser globals (window, document) at module
// initialization time and would throw in a Node.js environment.

const MERMAID_THEME = {
  startOnLoad: false,
  theme: "base" as const,
  themeVariables: {
    background: "#0A0826",
    mainBkg: "#1F1B47",
    nodeBorder: "#2A2560",
    clusterBkg: "#110F33",
    titleColor: "#F5F5FA",
    edgeLabelBackground: "#0A0826",
    lineColor: "#6B6890",
    textColor: "#B8B5D1",
    primaryColor: "#1F1B47",
    primaryTextColor: "#F5F5FA",
    primaryBorderColor: "#2A2560",
    secondaryColor: "#110F33",
    tertiaryColor: "#0A0826",
    fontFamily: "monospace",
    fontSize: "13px",
    labelBackground: "#0A0826",
    actorBorder: "#2A2560",
    actorBkg: "#1F1B47",
    actorTextColor: "#F5F5FA",
    activationBorderColor: "#0AFFD4",
    activationBkgColor: "rgba(10,255,212,0.08)",
    sequenceNumberColor: "#0AFFD4",
    signalColor: "#6B6890",
    signalTextColor: "#B8B5D1",
  },
};

// Module-level promise so mermaid is loaded and initialized only once.
let mermaidPromise: Promise<MermaidAPI> | null = null;

function getMermaid(): Promise<MermaidAPI> {
  mermaidPromise ??= import("mermaid").then((mod) => {
    const m = mod.default;
    m.initialize(MERMAID_THEME);
    return m;
  });
  return mermaidPromise;
}

// MDX wraps text between JSX tags in <p> elements rather than passing raw
// strings. This helper recursively collects all text leaf nodes from any
// React child tree so both `children="..."` and MDX prose children work.
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("\n");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

interface DiagramProps {
  children: React.ReactNode;
  caption?: string;
}

export function Diagram({ children, caption }: DiagramProps): React.JSX.Element {
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRendered(false);

    async function render() {
      try {
        const mermaid = await getMermaid();
        const source = extractText(children).trim();
        if (!source) return;
        const { svg } = await mermaid.render(diagramId, source);
        if (cancelled || !containerRef.current) return;
        // SAFETY: SVG produced by mermaid from admin-authored diagram syntax only.
        // Mermaid's renderer outputs sanitized SVG with no JS event handlers.
        containerRef.current.innerHTML = svg;
        setRendered(true);
      } catch {
        if (!cancelled) setError("Syntaxe de diagramme invalide");
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [children, diagramId]);

  return (
    <figure
      style={{
        margin: "32px 0",
        background: "#0A0826",
        border: "1px solid #1F1B47",
        borderLeft: "3px solid #0AFFD4",
        padding: "24px",
        overflowX: "auto",
      }}
    >
      {!rendered && error === null && (
        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: "#44406B",
            padding: "4px 0",
          }}
        >
          Chargement du diagramme…
        </div>
      )}
      {error !== null && (
        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: "#FF4757",
            padding: "4px 0",
          }}
        >
          ✗ {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          display: rendered ? "flex" : "none",
          justifyContent: "center",
        }}
      />
      {caption !== undefined && (
        <figcaption
          style={{
            marginTop: 16,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "#6B6890",
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
