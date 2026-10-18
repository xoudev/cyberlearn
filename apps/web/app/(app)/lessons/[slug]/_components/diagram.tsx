"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import type mermaidLib from "mermaid";
import type { MermaidConfig } from "mermaid";
import { diagramOutline } from "@cyberlearn/lib/mdx-diagram-outline";
import { BORDER, MONO, MUTED } from "@cyberlearn/ui";
import { extractDiagramSource } from "@cyberlearn/lib/mdx-diagram-source";
type MermaidAPI = typeof mermaidLib;

// Mermaid is imported dynamically inside useEffect so it is never evaluated
// during SSR: mermaid accesses browser globals (window, document) at module
// initialization time and would throw in a Node.js environment.

/*
 * The colours mermaid draws with, as hex and nothing else.
 *
 * Mermaid works out every shade it is not given (a box's border from its fill,
 * the tints of a git graph, the box behind an edge's label) with khroma, which
 * reads hex, rgb() and hsl() and throws on anything else. In October 2026 these
 * values became `var(--color-*)` like the rest of the site: initialize threw on
 * the first one, the failed load stayed cached for the whole visit, and every
 * lesson diagram showed its mermaid source instead of a drawing.
 *
 * The values are the dark theme's tokens (packages/ui/src/tokens.css), the one
 * the site renders in. A test holds each of them to hex.
 */
const SURFACE = "#0A0826"; // --color-bg-elevated
const BOX = "#1F1B47"; // --color-border-subtle
const OVERLAY = "#110F33"; // --color-bg-overlay
const TEXT = "#F5F5FA"; // --color-text-primary
const TEXT_SECONDARY = "#B8B5D1"; // --color-text-secondary
/** --cosmetic-accent when no accent is equipped: --color-brand-turquoise. */
const DEFAULT_ACCENT = "#0AFFD4";

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` written out as `#aabbcc`. */
function longHex(hex: string): string {
  return hex.length === 4 ? hex.replace(/[0-9a-f]/gi, (digit) => digit + digit) : hex;
}

/** `colour` laid over `under` at `amount` opacity, as the opaque hex it comes to. */
function blend(colour: string, under: string, amount: number): string {
  const channels = (hex: string): number[] =>
    [1, 3, 5].map((at) => parseInt(longHex(hex).slice(at, at + 2), 16));
  const bottom = channels(under);
  const mixed = channels(colour).map((top, i) =>
    Math.round(top * amount + (bottom[i] ?? 0) * (1 - amount)),
  );
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export const MERMAID_THEME = {
  startOnLoad: false,
  theme: "base" as const,
  themeVariables: {
    background: SURFACE,
    mainBkg: BOX,
    nodeBorder: BORDER,
    clusterBkg: OVERLAY,
    titleColor: TEXT,
    edgeLabelBackground: SURFACE,
    lineColor: MUTED,
    textColor: TEXT_SECONDARY,
    primaryColor: BOX,
    primaryTextColor: TEXT,
    primaryBorderColor: BORDER,
    secondaryColor: OVERLAY,
    tertiaryColor: SURFACE,
    fontFamily: "monospace",
    fontSize: "13px",
    labelBackground: SURFACE,
    actorBorder: BORDER,
    actorBkg: BOX,
    actorTextColor: TEXT,
    // The accent's three: see mermaidConfig for the learner's own.
    activationBorderColor: DEFAULT_ACCENT,
    activationBkgColor: blend(DEFAULT_ACCENT, SURFACE, 0.08),
    sequenceNumberColor: DEFAULT_ACCENT,
    signalColor: MUTED,
    signalTextColor: TEXT_SECONDARY,
  },
  // HTML labels put a <div><p> inside a <foreignObject> - real HTML, sitting
  // inside the lesson article, so the page's own paragraph styles apply to it.
  // Mermaid sized each box from a throwaway copy laid out elsewhere, then the
  // label was painted with different metrics and spilled out: "Le poste n a
  // plus Internet" wrapped onto a second line its 39px-tall foreignObject had
  // no room for, and the box clipped it. SVG labels are measured with getBBox
  // on the element that actually gets painted, and no page CSS reaches them.
  //
  // Must be top level: mermaid ignores flowchart.htmlLabels (verified - only
  // the root flag flips the output from <foreignObject> to <text>).
  htmlLabels: false,
  // Mermaid 12 lays flowcharts out with ELK and paints them in its "neo" look
  // unless told otherwise. Every lesson diagram was written and checked against
  // dagre and the classic look, so those stay pinned rather than letting the
  // whole catalogue re-lay itself out at once.
  layout: "dagre",
  look: "classic" as const,
} satisfies MermaidConfig;

/**
 * The learner's accent, as mermaid can read it. The figure inherits
 * --cosmetic-accent from the cosmetic theme they equipped, and the browser
 * hands back the colour that resolves to. Anything that is not a hex colour (a
 * theme written another way, a page with no styles) gives the default accent.
 */
function accentOf(element: Element): string {
  const value = getComputedStyle(element).getPropertyValue("--cosmetic-accent").trim();
  return HEX_COLOUR.test(value) ? longHex(value) : DEFAULT_ACCENT;
}

/**
 * The theme with the learner's accent where a drawing uses one: the
 * activations and the numbers of a sequence diagram. Never a `var()`: mermaid
 * reads the colour itself, not the page's stylesheet.
 */
export function mermaidConfig(accent: string): MermaidConfig {
  const hex = HEX_COLOUR.test(accent) ? longHex(accent) : DEFAULT_ACCENT;
  return {
    ...MERMAID_THEME,
    themeVariables: {
      ...MERMAID_THEME.themeVariables,
      activationBorderColor: hex,
      activationBkgColor: blend(hex, SURFACE, 0.08),
      sequenceNumberColor: hex,
    },
  };
}

/**
 * Mermaid lays a diagram out at the theme's 13px, and the viewBox it emits is
 * that natural size. Scaling the SVG away from it scales the text with it, so
 * how big the letters end up depended entirely on how wide the diagram happened
 * to be: a five-box flowchart (316px wide) stretched to fill a 900px column
 * rendered at 2.7x, and a wide one (1030px) squeezed into a phone column
 * rendered at 0.34x - about four pixels tall, unreadable.
 *
 * So the SVG is never enlarged past its natural size, and never shrunk below
 * the point where the text stops being legible. Past that floor the figure
 * scrolls sideways, which is the honest trade on a narrow screen.
 *
 * The floor was 0.7, labels of about 9px: smaller than anything else in the
 * lesson, a caption included. At 0.85 they are 11px, the size of the smallest
 * text a lesson otherwise sets.
 */
export const MIN_LEGIBLE_SCALE = 0.85; // 13px * 0.85 ≈ 11px

/** Natural width in CSS pixels, from the viewBox mermaid emits. */
function naturalWidthOf(svg: SVGElement): number | null {
  const viewBox = svg.getAttribute("viewBox");
  if (!viewBox) return null;
  const width = Number(viewBox.trim().split(/[\s,]+/)[2]);
  return Number.isFinite(width) && width > 0 ? width : null;
}

// Module-level promise so mermaid is loaded once, and initialized again only
// when the accent changes.
let mermaidPromise: Promise<MermaidAPI> | null = null;
let mermaidAccent: string | null = null;

function getMermaid(accent: string): Promise<MermaidAPI> {
  if (mermaidPromise === null || mermaidAccent !== accent) {
    const loading = import("mermaid").then((mod) => {
      const m = mod.default;
      m.initialize(mermaidConfig(accent));
      return m;
    });
    mermaidPromise = loading;
    mermaidAccent = accent;
    // A load or an initialize that failed used to stay cached: one colour
    // mermaid could not read, and every diagram of the visit fell back without
    // mermaid being asked again. Forgotten instead, so the next one retries.
    void loading.catch(() => {
      if (mermaidPromise === loading) {
        mermaidPromise = null;
        mermaidAccent = null;
      }
    });
  }
  return mermaidPromise;
}

/**
 * Tells Sentry a diagram did not draw. The reader still gets the outline, so
 * nothing on the page says anything went wrong: this is how an author learns
 * that a diagram needs fixing, or the team that every diagram does.
 */
function reportFailure(error: unknown, source: string): void {
  const message = error instanceof Error ? error.message : String(error);
  Sentry.captureException(error, {
    tags: { area: "lesson.diagram" },
    extra: { source },
    // One issue per cause, not one per diagram or per reader: a theme mermaid
    // cannot read fails every diagram with the same message.
    fingerprint: ["lesson-diagram", message],
  });
}

export interface DiagramProps {
  children: React.ReactNode;
  caption?: string;
}

export function Diagram({ children, caption }: DiagramProps): React.JSX.Element {
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const figureRef = useRef<HTMLElement>(null);
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
        const accent = figureRef.current ? accentOf(figureRef.current) : DEFAULT_ACCENT;
        const mermaid = await getMermaid(accent);
        // Mermaid measures every label to size the box around it. Measuring
        // before the mono webfont has loaded sizes the boxes for the fallback
        // font, and the real glyphs then spill out of them.
        if (typeof document !== "undefined" && "fonts" in document) {
          await document.fonts.ready;
        }
        const { svg } = await mermaid.render(diagramId, source);
        if (cancelled || !containerRef.current) return;
        // SAFETY: SVG produced by mermaid from admin-authored diagram syntax only.
        // Mermaid's renderer outputs sanitized SVG with no JS event handlers.
        containerRef.current.innerHTML = svg;

        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          const natural = naturalWidthOf(svgEl);
          svgEl.style.height = "auto";
          if (natural === null) {
            // No viewBox to reason about: keep the old containment so a stray
            // intrinsic width cannot widen the whole lesson column.
            svgEl.style.maxWidth = "100%";
          } else {
            svgEl.style.width = "100%";
            // Never blow the diagram up past the size it was laid out for…
            svgEl.style.maxWidth = `${String(Math.round(natural))}px`;
            // …and never shrink it into illegibility; scroll the figure instead.
            svgEl.style.minWidth = `${String(Math.round(natural * MIN_LEGIBLE_SCALE))}px`;
          }
        }
        setRendered(true);
      } catch (error) {
        // A failed render leaves mermaid's own detached probe element in the
        // document; without this it piles up and can stay visible.
        document.getElementById(diagramId)?.remove();
        document.getElementById(`d${diagramId}`)?.remove();
        if (cancelled) return;
        setFailed(true);
        reportFailure(error, source);
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [source, diagramId]);

  return (
    <figure
      ref={figureRef}
      style={{
        margin: "32px 0",
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-subtle)",
        borderLeft: "3px solid var(--cosmetic-accent)",
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
            color: "var(--color-text-faint)",
            padding: "4px 0",
          }}
        >
          Chargement du diagramme…
        </div>
      )}
      {failed && <DiagramFallback source={source} />}
      <div
        ref={containerRef}
        style={{
          display: rendered ? "flex" : "none",
          // "safe" matters: plain `center` on a child wider than its box
          // overflows on both sides, and the left half becomes unreachable
          // because scrolling cannot go negative. It falls back to start
          // alignment exactly when the diagram no longer fits.
          justifyContent: "safe center",
          width: "100%",
          minWidth: 0,
        }}
      />
      {caption !== undefined && (
        <figcaption
          style={{
            marginTop: 16,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--color-text-muted)",
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * What a diagram that would not draw leaves in the lesson. It used to be the
 * mermaid source, which reads as code (`A["Périmètre"] --> B[...]`) to someone
 * who came to learn what the drawing shows. The reader now gets the diagram
 * told in words, one line per arrow, and the source stays a click away for
 * whoever has to fix it.
 */
function DiagramFallback({ source }: { source: string }): React.JSX.Element {
  const outline = diagramOutline(source);
  return (
    <div role="note">
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--color-warning)",
          marginBottom: 8,
        }}
      >
        Schéma indisponible
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
        {outline.length > 0
          ? "Le dessin n'a pas pu s'afficher. Voici ce qu'il montre :"
          : "Le dessin n'a pas pu s'afficher."}
      </div>
      {outline.length > 0 && (
        <ul
          style={{
            margin: "12px 0 0",
            fontFamily: MONO,
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--color-text-secondary)",
          }}
        >
          {outline.map((line, i) => (
            // A line can repeat (two arrows between the same boxes): the
            // position keeps the keys apart.
            <li key={`${String(i)}-${line}`}>{line}</li>
          ))}
        </ul>
      )}
      <details style={{ marginTop: 12 }}>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--color-text-muted)",
          }}
        >
          Source du schéma
        </summary>
        <pre
          style={{
            fontFamily: MONO,
            fontSize: 12,
            lineHeight: 1.7,
            color: "var(--color-text-secondary)",
            margin: "8px 0 0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {source}
        </pre>
      </details>
    </div>
  );
}
