"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type mermaidLib from "mermaid";
import { extractDiagramSource } from "@/lib/mdx/extract-diagram-source";
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

interface DiagramProps {
  children: React.ReactNode;
  caption?: string;
}

export function Diagram({ children, caption }: DiagramProps): React.JSX.Element {
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);

  // `children` is a fresh object on every render, so keying the effect on it
  // re-ran mermaid.render() with the same id on every parent update. The source
  // string is what actually decides whether a re-render is needed.
  const source = useMemo(() => extractDiagramSource(children).trim(), [children]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setRendered(false);
    if (!source) return;

    async function render(): Promise<void> {
      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(diagramId, source);
        if (cancelled || !containerRef.current) return;
        // SAFETY: SVG produced by mermaid from admin-authored diagram syntax only.
        // Mermaid's renderer outputs sanitized SVG with no JS event handlers.
        containerRef.current.innerHTML = svg;
        // Mermaid emits an intrinsic pixel width on the SVG (via a max-width
        // style plus width/height attributes). Left as-is, that width leaks up
        // the flex/grid chain and locks the whole lesson column to the diagram
        // size. Force the SVG to scale down to its container instead.
        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.style.maxWidth = "100%";
          svgEl.style.height = "auto";
        }
        setRendered(true);
      } catch {
        // A failed render leaves mermaid's own detached probe element in the
        // document; without this it piles up and can stay visible.
        document.getElementById(diagramId)?.remove();
        document.getElementById(`d${diagramId}`)?.remove();
        if (!cancelled) setFailed(true);
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [source, diagramId]);

  return (
    <figure
      style={{
        margin: "32px 0",
        background: "#0A0826",
        border: "1px solid #1F1B47",
        borderLeft: "3px solid #0AFFD4",
        padding: "24px",
        // min-width:0 lets the figure shrink below the diagram's intrinsic
        // width inside its flex/grid parent; width:100% keeps it filling the
        // column. overflowX:auto is the fallback so an oversized diagram
        // scrolls inside its own box rather than widening the page.
        minWidth: 0,
        width: "100%",
        overflowX: "auto",
      }}
    >
      {!rendered && !failed && (
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
      {/* A diagram that will not draw used to leave a bare red error line in the
          middle of the lesson, which taught the reader nothing. Showing the
          description it was built from at least keeps the content readable. */}
      {failed && (
        <pre
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            lineHeight: 1.7,
            color: "#B8B5D1",
            margin: 0,
            padding: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {source}
        </pre>
      )}
      <div
        ref={containerRef}
        style={{
          display: rendered ? "flex" : "none",
          justifyContent: "center",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
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
