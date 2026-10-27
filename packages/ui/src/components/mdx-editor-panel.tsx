"use client";

/**
 * The lesson editor: a column of blocks or Monaco over the same MDX, a
 * toolbar, a live preview and a guide to every component the MDX pipeline
 * understands, built from the registry in @cyberlearn/lib
 * (mdx-guide-sections.ts) so that it lists all of them.
 *
 * Blocks first: the lesson as headings, text and components drawn as forms
 * (block-editor/), which is how most of a lesson gets written. The code is
 * one click away and stays the lesson itself: switching views changes
 * nothing in it, and MDX that does not cut into blocks keeps the code view,
 * with the parser's reason.
 *
 * Shared rather than copied because both people who write lessons deserve the
 * same tool - the admin writing the catalogue, and a teacher writing for their
 * own class. Two copies would mean a component added to the pipeline gets a
 * guide entry in one editor and not the other, and the teacher quietly ends up
 * with the lesser half of the product.
 *
 * Two previews. The real one is the site's: given a `preview` prop, the panel
 * sends the draft to the site after each pause in typing and frames the page
 * the site renders, with the lesson components themselves (mdx-preview-frame).
 * The quick one is a deliberate approximation: it reads the MDX with regular
 * expressions so it can run on every keystroke without the remark/rehype
 * chain. It is what the panel has without a `preview`, and a switch away with.
 *
 * Side by side only where both halves keep a width worth writing in
 * (SPLIT_MIN_PANEL_WIDTH, measured on the panel itself, so whatever sits
 * beside it - a sidebar, a gutter - is counted). Narrower, the editor
 * takes the whole width and a pair of tabs, « Éditeur » and « Aperçu », shows
 * one or the other; both stay mounted, so Monaco keeps its undo history and
 * the site's frame its page. The separator between the halves moves, by
 * pointer or by arrow key, and the browser remembers where it was left
 * (mdx-editor-layout). The panel is 620px high unless told otherwise; `fill`
 * hands it its container's height, which is how the console's studio gives it
 * the window.
 */

import { ACCENT, BORDER, MONO } from "../lib/palette.js";
import React, { useRef, useState, useEffect, useCallback, useId, useMemo } from "react";
import dynamic from "next/dynamic";
import type { OnMount, BeforeMount } from "@monaco-editor/react";
import { lessonComponent } from "@cyberlearn/lib/mdx-components";
import {
  filterGuide,
  guideSections,
  type GuideEntry,
  type GuideGroup,
  type GuideSection,
} from "./mdx-guide-sections";
import { parseLessonBlocks } from "@cyberlearn/lib/mdx-blocks";
import { BlockEditor } from "./block-editor/block-editor";
import { MDX_EDITOR_THEME, mdxEditorTheme } from "./mdx-editor-theme";
import {
  clampSplit,
  opensSplit,
  readStoredSplit,
  SPLIT_DEFAULT,
  SPLIT_MAX,
  SPLIT_MIN,
  SPLIT_STEP,
  splitAt,
  storeSplit,
} from "./mdx-editor-layout";
import { MdxPreviewFrame, PaneButton, type MdxEditorPreview } from "./mdx-preview-frame";
import { inLessonOrder, LESSON_CHECK_OWNER, type MdxProblem, problemMarkers } from "./mdx-problems";
import { inlineTokens, innerText, parseStringProps, stripImportDeclarations } from "./mdx-source";

export { useLessonPreview } from "./mdx-preview-frame";
export type { LessonPreviewAction, MdxEditorPreview, MdxPreviewResult } from "./mdx-preview-frame";
export type { MdxProblem } from "./mdx-problems";
export { MOBILE_PREVIEW_WIDTH, type PreviewDevice } from "./mdx-editor-layout";

type EditorInstance = Parameters<OnMount>[0];
const DANGER = "var(--color-danger)";

/**
 * The part of Monaco's namespace the panel uses: the markers, and the keys of
 * the save shortcut. Its own types do not resolve in this package
 * (monaco-editor is @monaco-editor/react's dependency, not this one's), so
 * the members are typed here.
 */
interface MarkerApi {
  editor: {
    setModelMarkers: (
      model: unknown,
      owner: string,
      markers: (ReturnType<typeof problemMarkers>[number] & { severity: number })[],
    ) => void;
  };
  MarkerSeverity: { Error: number };
  KeyMod: { CtrlCmd: number };
  KeyCode: { KeyS: number };
}

// ── Dynamic import - Monaco has no SSR support ─────────────────────────────────
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        background: "var(--color-bg-base)",
        display: "grid",
        placeItems: "center",
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
      }}
    >
      {"// chargement éditeur…"}
    </div>
  ),
});

// ── Preview - inline markdown renderer ────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  return inlineTokens(text).map((token, i) => {
    switch (token.kind) {
      case "strong":
        return (
          <strong key={i} style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>
            {token.text}
          </strong>
        );
      case "em":
        return (
          <em key={i} style={{ color: "var(--color-text-secondary)" }}>
            {token.text}
          </em>
        );
      case "code":
        return (
          <code
            key={i}
            style={{
              fontFamily: MONO,
              background: "var(--color-bg-overlay)",
              color: ACCENT,
              padding: "1px 5px",
              fontSize: "0.88em",
            }}
          >
            {token.text}
          </code>
        );
      case "link":
        return (
          <span
            key={i}
            style={{ color: "var(--color-info)", textDecoration: "underline", cursor: "pointer" }}
          >
            {token.text}
          </span>
        );
      case "text":
        return <React.Fragment key={i}>{token.text}</React.Fragment>;
    }
  });
}

function PreviewComponent({ source }: { source: string }): React.ReactElement {
  const nameMatch = /^<([A-Z]\w*)/.exec(source);
  const name = nameMatch?.[1] ?? "Unknown";
  const props = parseStringProps(source);
  const inner = innerText(source);

  if (name === "Callout") {
    const type = props.type ?? "info";
    const meta: Record<string, { border: string; bg: string; color: string; label: string }> = {
      info: {
        border: "var(--color-info)",
        bg: "color-mix(in srgb, var(--color-info) 8%, transparent)",
        color: "var(--color-info)",
        label: "INFO",
      },
      warning: {
        border: "var(--color-warning)",
        bg: "color-mix(in srgb, var(--color-warning) 8%, transparent)",
        color: "var(--color-warning)",
        label: "ATTENTION",
      },
      danger: {
        border: DANGER,
        bg: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
        color: DANGER,
        label: "DANGER",
      },
      success: {
        border: ACCENT,
        bg: "color-mix(in srgb, var(--cosmetic-accent) 8%, transparent)",
        color: ACCENT,
        label: "SUCCÈS",
      },
    };
    // SAFETY: fallback to info when type is unknown
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = meta[type] ?? meta.info!;
    return (
      <div
        style={{
          margin: "14px 0",
          padding: "12px 16px",
          background: c.bg,
          border: `1px solid color-mix(in srgb, ${c.border} 27%, transparent)`,
          borderLeft: `3px solid ${c.border}`,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            color: c.color,
            letterSpacing: "0.12em",
            marginBottom: 6,
          }}
        >
          {c.label}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.65,
          }}
        >
          {inner || "…"}
        </p>
      </div>
    );
  }

  if (name === "Quiz") {
    return (
      <div
        style={{
          margin: "14px 0",
          padding: "14px 16px",
          background: "var(--color-bg-elevated)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "var(--color-text-muted)",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          QUIZ · {props.id ?? "?"}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-primary)", fontWeight: 600 }}>
          {props.question ?? "Question…"}
        </p>
        {props.options && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 11,
              color: "var(--color-text-muted)",
              fontFamily: MONO,
            }}
          >
            {props.options}
          </p>
        )}
      </div>
    );
  }

  if (name === "CodeBlock" || name === "CodePlayground") {
    const lang = props.lang ?? props.language ?? "code";
    return (
      <div
        style={{
          margin: "14px 0",
          background: "var(--color-bg-elevated)",
          border: `1px solid var(--color-border-subtle)`,
          borderLeft: `3px solid ${ACCENT}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "5px 14px",
            borderBottom: "1px solid var(--color-border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              color: ACCENT,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {lang}
          </span>
          {name === "CodePlayground" && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: MONO,
                fontSize: 9,
                color: "var(--color-info)",
              }}
            >
              ⚡ interactive
            </span>
          )}
        </div>
        <pre
          style={{
            margin: 0,
            padding: "10px 14px",
            fontFamily: MONO,
            fontSize: 12,
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
          }}
        >
          {inner || "// …"}
        </pre>
      </div>
    );
  }

  if (name === "Image") {
    return (
      <div
        style={{
          margin: "14px 0",
          padding: "18px",
          background: "var(--color-bg-elevated)",
          border: `1px dashed ${BORDER}`,
          textAlign: "center",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--color-text-muted)" }}>
          🖼 {props.alt ?? props.src ?? "image"}
        </span>
      </div>
    );
  }

  // Every other component: a card naming it, with what the author called it.
  // The real rendering is the lesson page's; this says what will be there.
  const spec = lessonComponent(name);
  const heading = props.title ?? props.question ?? props.caption ?? props.id;
  return (
    <div
      style={{
        margin: "10px 0",
        padding: "8px 12px",
        background: "var(--color-bg-elevated)",
        border: `1px solid var(--color-border-default)`,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: "var(--color-info)",
          letterSpacing: "0.1em",
        }}
      >
        {spec ? spec.label.toUpperCase() : "COMPOSANT"}
      </span>
      <code style={{ fontFamily: MONO, fontSize: 11, color: "var(--color-text-muted)" }}>
        &lt;{name}&gt;
      </code>
      {heading !== undefined && (
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flexBasis: "100%" }}>
          {heading}
        </span>
      )}
      {!spec && (
        <span style={{ fontSize: 11, color: DANGER, flexBasis: "100%" }}>
          Composant inconnu de la leçon : il ne sera pas rendu.
        </span>
      )}
    </div>
  );
}

function MdxPreview({ content }: { content: string }): React.ReactElement {
  // Frontmatter and import declarations are not part of what the page draws.
  const body = stripImportDeclarations(content.replace(/^---[\s\S]*?---\n?/, ""));

  const lines = body.split("\n");
  const elements: React.ReactElement[] = [];
  let idx = 0;
  let k = 0;
  let h2Idx = 0;

  while (idx < lines.length) {
    const line = lines[idx] ?? "";

    if (line.trim() === "") {
      idx++;
      continue;
    }

    // H1
    const h1 = /^#\s+(.+)/.exec(line);
    if (h1) {
      elements.push(
        <h1
          key={k++}
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontWeight: 700,
            fontSize: 22,
            color: "var(--color-text-primary)",
            margin: "20px 0 12px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {renderInline(h1[1] ?? "")}
        </h1>,
      );
      idx++;
      continue;
    }

    // H2
    const h2 = /^##\s+(.+)/.exec(line);
    if (h2) {
      h2Idx++;
      elements.push(
        <h2
          key={k++}
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontWeight: 700,
            fontSize: 22,
            color: "var(--color-text-primary)",
            margin: "24px 0 10px",
            paddingLeft: 14,
            borderLeft: `3px solid ${ACCENT}`,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "var(--color-text-muted)",
              marginRight: 8,
              fontWeight: 500,
            }}
          >
            {String(h2Idx).padStart(2, "0")}
          </span>
          {renderInline(h2[1] ?? "")}
        </h2>,
      );
      idx++;
      continue;
    }

    // H3
    const h3 = /^###\s+(.+)/.exec(line);
    if (h3) {
      elements.push(
        <h3
          key={k++}
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--color-text-secondary)",
            margin: "16px 0 6px",
            letterSpacing: "0.01em",
          }}
        >
          {renderInline(h3[1] ?? "")}
        </h3>,
      );
      idx++;
      continue;
    }

    // HR
    if (/^---+$/.test(line)) {
      elements.push(
        <hr key={k++} style={{ border: 0, borderTop: `1px solid ${BORDER}`, margin: "18px 0" }} />,
      );
      idx++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "text";
      const code: string[] = [];
      idx++;
      while (idx < lines.length && !(lines[idx] ?? "").startsWith("```")) {
        code.push(lines[idx] ?? "");
        idx++;
      }
      idx++;
      elements.push(
        <div
          key={k++}
          style={{
            margin: "14px 0",
            background: "var(--color-bg-elevated)",
            border: `1px solid var(--color-border-subtle)`,
            borderLeft: `3px solid ${ACCENT}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{ padding: "5px 14px", borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: ACCENT,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {lang}
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "10px 14px",
              fontFamily: MONO,
              fontSize: 12,
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
            {code.join("\n")}
          </pre>
        </div>,
      );
      continue;
    }

    // List
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (idx < lines.length && /^[-*+]\s/.test(lines[idx] ?? "")) {
        items.push((lines[idx] ?? "").slice(2));
        idx++;
      }
      elements.push(
        <ul key={k++} style={{ margin: "10px 0", paddingLeft: 16, listStyle: "none" }}>
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 13,
                lineHeight: 1.7,
                marginBottom: 3,
                display: "flex",
                gap: 8,
              }}
            >
              <span style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }}>›</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // JSX component
    if (/^<[A-Z]/.test(line)) {
      const compLines: string[] = [line];
      if (!line.includes("/>") && !/<\/[A-Z]/.test(line)) {
        idx++;
        while (idx < lines.length) {
          const cl = lines[idx] ?? "";
          compLines.push(cl);
          idx++;
          if (cl.includes("/>") || /<\/[A-Z]/.test(cl)) break;
        }
      } else {
        idx++;
      }
      elements.push(<PreviewComponent key={k++} source={compLines.join("\n")} />);
      continue;
    }

    // Paragraph
    const paras: string[] = [];
    while (
      idx < lines.length &&
      (lines[idx] ?? "").trim() !== "" &&
      !/^#{1,6}\s/.test(lines[idx] ?? "") &&
      !(lines[idx] ?? "").startsWith("```") &&
      !/^[-*+]\s/.test(lines[idx] ?? "") &&
      !/^<[A-Z]/.test(lines[idx] ?? "") &&
      !/^---+$/.test(lines[idx] ?? "")
    ) {
      paras.push(lines[idx] ?? "");
      idx++;
    }
    if (paras.length > 0) {
      elements.push(
        <p
          key={k++}
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 15,
            lineHeight: 1.75,
            margin: "10px 0",
          }}
        >
          {renderInline(paras.join(" "))}
        </p>,
      );
    }
  }

  if (elements.length === 0) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.08em",
        }}
      >
        {"// commencez à écrire du MDX…"}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)" }}>
      {elements}
    </div>
  );
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

function TBtn({
  label,
  title,
  onClick,
  active = false,
  mono = false,
}: {
  label: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  mono?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => {
        setHov(true);
      }}
      onMouseLeave={() => {
        setHov(false);
      }}
      style={{
        height: 44,
        minWidth: 44,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active || hov ? "var(--color-bg-overlay)" : "transparent",
        border: active ? `1px solid ${BORDER}` : "1px solid transparent",
        color: active ? ACCENT : hov ? "var(--color-text-primary)" : "var(--color-text-muted)",
        fontFamily: mono ? MONO : "var(--font-sans, system-ui, sans-serif)",
        fontWeight: mono ? 700 : 600,
        fontSize: 13,
        cursor: "pointer",
        transition: "all 120ms ease",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function Sep() {
  return (
    <span style={{ width: 1, height: 20, background: BORDER, flexShrink: 0, margin: "0 4px" }} />
  );
}

/** The language or variant beside a toolbar button: a control, so 44px like one. */
const TOOL_SELECT: React.CSSProperties = {
  height: 44,
  background: "var(--color-bg-elevated)",
  border: `1px solid ${BORDER}`,
  color: "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
  padding: "0 6px",
  outline: "none",
};

// ── MDX Authoring Guide ─────────────────────────────────────────────────────────

const GUIDE_SECTIONS: GuideSection[] = guideSections();

/* Starter code goes in starterCode, between backticks: written between the
 * tags, the braces of a C or JavaScript body are an MDX expression, and the
 * check refused the lesson once the snippet was inserted. */
const SANDBOX_DEFAULTS: Record<string, string> = {
  python: 'print("Hello, World!")',
  javascript: 'console.log("Hello, World!");',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\\\n");\n    return 0;\n}',
  asm: "global main\nsection .text\nmain:\n    mov rax, 42\n    println rax\n    ret",
};

function GuideRow({
  entry,
  accent,
  onInsert,
}: {
  entry: GuideEntry;
  accent: string;
  onInsert: (s: string) => void;
}): React.ReactElement {
  const [done, setDone] = useState(false);
  const [hov, setHov] = useState(false);
  const firstLine = entry.snippet.split("\n")[0] ?? "";
  const preview = firstLine.length > 36 ? firstLine.slice(0, 33) + "…" : firstLine;

  return (
    <div style={{ borderBottom: "1px solid var(--color-border-subtle)", padding: "5px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <code
          style={{
            flex: 1,
            fontFamily: MONO,
            fontSize: 10.5,
            color: "var(--color-text-faint)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {preview || entry.label}
        </code>
        <button
          type="button"
          title={entry.snippet}
          onMouseEnter={() => {
            setHov(true);
          }}
          onMouseLeave={() => {
            setHov(false);
          }}
          onClick={() => {
            onInsert(entry.snippet);
            setDone(true);
            setTimeout(() => {
              setDone(false);
            }, 900);
          }}
          style={{
            flexShrink: 0,
            minHeight: 44,
            minWidth: 44,
            padding: "0 10px",
            border: `1px solid ${
              done
                ? "color-mix(in srgb, var(--cosmetic-accent) 40%, transparent)"
                : hov
                  ? `color-mix(in srgb, ${accent} 40%, transparent)`
                  : "var(--color-border-default)"
            }`,
            background: done
              ? "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)"
              : hov
                ? `color-mix(in srgb, ${accent} 7%, transparent)`
                : "transparent",
            color: done ? ACCENT : hov ? accent : "var(--color-text-secondary)",
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 120ms ease",
          }}
        >
          {done ? "✓" : entry.label}
        </button>
      </div>
      {entry.description && (
        <div
          style={{
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--color-text-muted)",
            marginTop: 2,
          }}
        >
          {entry.description}
        </div>
      )}
    </div>
  );
}

function GuideGroupBlock({
  group,
  accent,
  onInsert,
}: {
  group: GuideGroup;
  accent: string;
  onInsert: (s: string) => void;
}): React.ReactElement {
  return (
    <div style={{ marginTop: group.name === undefined ? 0 : 10 }}>
      {group.name !== undefined && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
          <code
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--color-text-secondary)",
            }}
          >
            &lt;{group.name}&gt;
          </code>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{group.label}</span>
          {group.docUrl !== undefined && (
            <a
              href={group.docUrl}
              target="_blank"
              rel="noreferrer"
              title="Sa section du guide de rédaction"
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-sans, system-ui, sans-serif)",
                fontSize: 12,
                fontWeight: 600,
                color: accent,
                textDecoration: "none",
              }}
            >
              Guide ↗
            </a>
          )}
        </div>
      )}
      {group.description !== undefined && (
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--color-text-muted)",
          }}
        >
          {group.description}
        </p>
      )}
      {group.entries.map((entry) => (
        <GuideRow key={entry.label} entry={entry} accent={accent} onInsert={onInsert} />
      ))}
    </div>
  );
}

function MdxGuide({ onInsert }: { onInsert: (s: string) => void }): React.ReactElement {
  const [query, setQuery] = useState("");
  const sections = useMemo(() => filterGuide(GUIDE_SECTIONS, query), [query]);
  const componentCount = GUIDE_SECTIONS.reduce(
    (count, section) => count + section.groups.filter((g) => g.name !== undefined).length,
    0,
  );

  return (
    <div
      className="mdx-editor-guide"
      style={{ height: "100%", overflowY: "auto", background: "var(--color-bg-elevated)" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "var(--color-bg-elevated)",
          zIndex: 1,
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: 12,
            color: "var(--color-text-muted)",
            padding: "10px 16px 6px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <b style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>Guide MDX</b>
          <span style={{ marginLeft: "auto" }}>{componentCount} composants · clic → insérer</span>
        </div>
        <div style={{ padding: "0 16px 8px" }}>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Chercher un composant, un scénario, un langage…"
            aria-label="Chercher dans le guide"
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 44,
              background: "var(--color-bg-base)",
              border: `1px solid ${BORDER}`,
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: 13,
              padding: "0 12px",
              outline: "none",
            }}
          />
        </div>
      </div>
      <div style={{ padding: "4px 16px 32px" }}>
        {sections.length === 0 && (
          <p
            style={{
              margin: "16px 0",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            Rien ne correspond à « {query.trim()} ».
          </p>
        )}
        {sections.map((section) => (
          <div key={section.id} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  background: section.accent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display, sans-serif)",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  color: section.accent,
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--color-border-subtle)" }} />
            </div>
            {section.groups.map((group) => (
              <GuideGroupBlock
                key={group.name ?? group.label}
                group={group}
                accent={section.accent}
                onInsert={onInsert}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── The two panes, one at a time ───────────────────────────────────────────────

interface PaneIds {
  editor: string;
  preview: string;
  editorTab: string;
  previewTab: string;
}

/**
 * « Éditeur » and « Aperçu » where the panel is too narrow for both: a tablist
 * as WAI-ARIA describes it, the arrow keys, Home and End moving the selection
 * and the focus together, only the selected tab in the Tab order.
 */
function PaneTabs({
  ids,
  pane,
  secondLabel,
  onSelect,
}: {
  ids: PaneIds;
  pane: "editor" | "preview";
  /** « Aperçu », or « Guide » while the guide is what the second pane holds. */
  secondLabel: string;
  onSelect: (pane: "editor" | "preview") => void;
}): React.ReactElement {
  const tabs = [
    { pane: "editor", id: ids.editorTab, controls: ids.editor, label: "Éditeur" },
    { pane: "preview", id: ids.previewTab, controls: ids.preview, label: secondLabel },
  ] as const;
  const choose = (next: "editor" | "preview"): void => {
    onSelect(next);
    document.getElementById(next === "editor" ? ids.editorTab : ids.previewTab)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Éditeur ou aperçu"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        background: "var(--color-bg-elevated)",
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.pane === pane;
        return (
          <button
            key={tab.pane}
            type="button"
            role="tab"
            id={tab.id}
            aria-selected={selected}
            aria-controls={tab.controls}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onSelect(tab.pane);
            }}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowLeft" || event.key === "Home"
                  ? "editor"
                  : event.key === "ArrowRight" || event.key === "End"
                    ? "preview"
                    : null;
              if (next === null) return;
              event.preventDefault();
              choose(next);
            }}
            style={{
              minHeight: 44,
              padding: "0 16px",
              border: 0,
              borderBottom: `2px solid ${selected ? ACCENT : "transparent"}`,
              background: "transparent",
              color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MdxEditorPanelProps {
  value: string;
  onChange: (v: string) => void;
  /** The site's rendering of the draft, when the app provides it (useLessonPreview). */
  preview?: MdxEditorPreview;
  /**
   * What the last save's content check found, each at its line and column:
   * marked in the editor and listed above it. A save that ran the check sends
   * a new array, empty when the content passed; one that stopped before it (a
   * title the form refused) sends none, and what is on show stays. The site's
   * preview, when it answers for a later draft, replaces them with what it
   * found.
   */
  problems?: readonly MdxProblem[] | undefined;
  /** The height of the editor and its preview, under the toolbar. 620px when left out. */
  height?: number | string;
  /** Takes all of its container's height instead, which the container must have. */
  fill?: boolean;
  /**
   * What ⌘S (Ctrl+S) does from the code view, where Monaco has the keyboard.
   * The block view's fields are plain inputs: the app's own listener on the
   * window (useSaveShortcut) takes the shortcut there.
   */
  onSave?: (() => void) | undefined;
}

export function MdxEditorPanel({
  value,
  onChange,
  preview,
  problems,
  height = 620,
  fill = false,
  onSave,
}: MdxEditorPanelProps): React.ReactElement {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MarkerApi | null>(null);
  /** Where to go once Monaco is there, when a problem is opened from the block view. */
  const pendingReveal = useRef<MdxProblem | null>(null);
  const [mounts, setMounts] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // The problems on show: the last save's, until the preview answers for a
  // later draft. A save is told apart by its array, not by what it holds: the
  // same faults saved again after the preview cleared them are a new finding.
  // The array is the action state's, so a render of the page keeps it.
  const [shown, setShown] = useState<readonly MdxProblem[]>(problems ?? []);
  const [received, setReceived] = useState(problems);
  if (problems !== received) {
    setReceived(problems);
    if (problems !== undefined) setShown(problems);
  }
  const [split, setSplit] = useState(true);
  const baseId = useId();
  const ids = useMemo(
    () => ({
      editor: `${baseId}-editor`,
      preview: `${baseId}-preview`,
      editorTab: `${baseId}-editor-tab`,
      previewTab: `${baseId}-preview-tab`,
    }),
    [baseId],
  );
  const [codeLang, setCodeLang] = useState("bash");
  const [calloutType, setCalloutType] = useState<"info" | "warning" | "danger" | "success">("info");
  const [sandboxLang, setSandboxLang] = useState<"python" | "javascript" | "c" | "asm">("python");
  const [terminalShell, setTerminalShell] = useState<"bash" | "powershell">("bash");
  const [quickPreview, setQuickPreview] = useState(value);
  const [showGuide, setShowGuide] = useState(false);
  const [editorMode, setEditorMode] = useState<"blocks" | "code">(() =>
    parseLessonBlocks(value).ok ? "blocks" : "code",
  );
  const [blocksProblem, setBlocksProblem] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"site" | "quick">("site");
  const sitePreview = preview !== undefined && previewMode === "site";

  // The editor's share of the width: the default on the server and on the
  // first render, then what this browser kept.
  const [splitPct, setSplitPct] = useState(SPLIT_DEFAULT);
  const [dragging, setDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const stored = readStoredSplit();
    if (stored !== null) setSplitPct(stored);
  }, []);
  // Whether the panel is wide enough for both halves: measured as it mounts,
  // then again whenever it is resized (a window, a sidebar, a disclosure
  // opening above it). Until it is measured (null), laid out as the server
  // renders it: both.
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = (): void => {
      setWide(opensSplit(panel.getBoundingClientRect().width));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => {
      observer.disconnect();
    };
  }, []);
  // Side by side, or one pane at a time behind the tabs: on a narrow panel,
  // or on a wide one whose author turned the split off.
  const sideBySide = (wide ?? true) && split;
  const [pane, setPane] = useState<"editor" | "preview">("editor");
  const showsEditor = sideBySide || pane === "editor";
  const showsPreview = sideBySide || pane === "preview";
  // The preview is mounted the first time it is seen, once the panel has been
  // measured, and kept from then on: a phone that never opens it sends
  // nothing to the site, and switching tabs does not reload the frame.
  const [previewMounted, setPreviewMounted] = useState(false);
  if (wide !== null && showsPreview && !previewMounted) setPreviewMounted(true);
  const moveSplit = useCallback((next: number, keep: boolean) => {
    const clamped = clampSplit(next);
    setSplitPct(clamped);
    if (keep) storeSplit(clamped);
  }, []);

  // Debounced quick preview update
  useEffect(() => {
    const t = setTimeout(() => {
      setQuickPreview(value);
    }, 350);
    return () => {
      clearTimeout(t);
    };
  }, [value]);

  const lineCount = value.split("\n").length;
  const charCount = value.length;

  const revealProblem = useCallback((problem: MdxProblem) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.revealLineInCenter(problem.line);
    ed.setPosition({ lineNumber: problem.line, column: problem.column });
    ed.focus();
  }, []);

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      editorRef.current = editor;
      // Monaco's namespace, read through MarkerApi: its own type does not resolve here.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      monacoRef.current = monaco;
      // Re-runs the markers' effect: a new editor has a new model.
      setMounts((n) => n + 1);
      // Monaco keeps the keys it is given a command for: the browser's own
      // "save the page" never opens over the editor, and the app's listener on
      // the window is not called a second time.
      const keys = monacoRef.current;
      if (onSaveRef.current !== undefined && keys !== null) {
        editor.addCommand(keys.KeyMod.CtrlCmd | keys.KeyCode.KeyS, () => {
          onSaveRef.current?.();
        });
      }
      const pending = pendingReveal.current;
      pendingReveal.current = null;
      if (pending !== null) revealProblem(pending);
    },
    [revealProblem],
  );

  // The problems as Monaco markers, under the text they point at.
  useEffect(() => {
    const model = editorRef.current?.getModel();
    const monaco = monacoRef.current;
    if (!model || !monaco) return;
    const markers = problemMarkers(shown, model.getLineCount(), (line) =>
      model.getLineContent(line),
    ).map((marker) => ({ ...marker, severity: monaco.MarkerSeverity.Error }));
    monaco.editor.setModelMarkers(model, LESSON_CHECK_OWNER, markers);
  }, [shown, mounts, editorMode]);

  const openProblem = useCallback(
    (problem: MdxProblem) => {
      // Behind the tabs, the editor is shown first: the line is in it.
      setPane("editor");
      if (editorMode === "code") {
        revealProblem(problem);
        return;
      }
      // The block view has no lines: the code view opens, and goes there
      // once Monaco has mounted.
      pendingReveal.current = problem;
      setBlocksProblem(null);
      setEditorMode("code");
    },
    [editorMode, revealProblem],
  );

  const listed = useMemo(() => inLessonOrder(shown), [shown]);
  // Defined at each mount, not once per page: the cursor is the accent equipped
  // now, read under the panel (mdx-editor-theme.ts).
  const handleBefore = useCallback<BeforeMount>((monaco) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    monaco.editor.defineTheme(MDX_EDITOR_THEME, mdxEditorTheme(panelRef.current));
  }, []);

  // Insert raw text at cursor; in the block view, as blocks at the end.
  const insertAt = useCallback(
    (text: string) => {
      if (editorMode === "blocks") {
        onChange(`${value.trimEnd()}\n\n${text.trim()}\n`);
        return;
      }
      const ed = editorRef.current;
      if (!ed) return;
      const sel = ed.getSelection();
      if (!sel) return;
      ed.executeEdits("toolbar", [{ range: sel, text, forceMoveMarkers: true }]);
      ed.focus();
    },
    [editorMode, onChange, value],
  );

  // Wrap selection (or placeholder) with before/after
  const wrap = useCallback((before: string, after: string, placeholder = "texte") => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = ed.getSelection();
    if (!sel) return;
    const inner = ed.getModel()?.getValueInRange(sel) ?? placeholder;
    ed.executeEdits("toolbar", [
      { range: sel, text: `${before}${inner}${after}`, forceMoveMarkers: true },
    ]);
    ed.focus();
  }, []);

  // Toggle prefix on current line
  const toggleLinePrefix = useCallback((prefix: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.getPosition();
    if (!pos) return;
    const model = ed.getModel();
    if (!model) return;
    const current = model.getLineContent(pos.lineNumber);
    const range = {
      startLineNumber: pos.lineNumber,
      startColumn: 1,
      endLineNumber: pos.lineNumber,
      endColumn: model.getLineMaxColumn(pos.lineNumber),
    };
    ed.executeEdits("toolbar", [
      {
        range,
        text: current.startsWith(prefix) ? current.slice(prefix.length) : `${prefix}${current}`,
        forceMoveMarkers: true,
      },
    ]);
    ed.focus();
  }, []);

  return (
    <div
      ref={panelRef}
      className="mdx-editor-panel"
      style={{
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
        background: "var(--color-bg-base)",
        display: "flex",
        flexDirection: "column",
        height: fill ? "100%" : undefined,
        minHeight: 0,
      }}
    >
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div
        className="mdx-editor-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "var(--color-bg-elevated)",
          borderBottom: `1px solid ${BORDER}`,
          minHeight: 52,
          padding: "4px 10px",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {/* Blocks or code: the same lesson, two views */}
        <TBtn
          label="Blocs"
          title="Éditer par blocs : un champ pour chaque chose"
          active={editorMode === "blocks"}
          onClick={() => {
            const parsed = parseLessonBlocks(value);
            if (parsed.ok) {
              setBlocksProblem(null);
              setEditorMode("blocks");
            } else {
              setBlocksProblem(parsed.error);
            }
          }}
        />
        <TBtn
          label="Code"
          title="Éditer le MDX"
          active={editorMode === "code"}
          onClick={() => {
            setBlocksProblem(null);
            setEditorMode("code");
          }}
        />

        <Sep />

        {editorMode === "code" && (
          <>
            {/* Inline formatting */}
            <TBtn
              label={<b>B</b>}
              title="Gras"
              onClick={() => {
                wrap("**", "**");
              }}
              mono
            />
            <TBtn
              label={<i>I</i>}
              title="Italique"
              onClick={() => {
                wrap("*", "*");
              }}
            />
            <TBtn
              label="`"
              title="Code inline"
              onClick={() => {
                wrap("`", "`", "code");
              }}
              mono
            />

            <Sep />

            {/* Headings */}
            <TBtn
              label="H2"
              title="Titre H2"
              onClick={() => {
                toggleLinePrefix("## ");
              }}
              mono
            />
            <TBtn
              label="H3"
              title="Titre H3"
              onClick={() => {
                toggleLinePrefix("### ");
              }}
              mono
            />

            <Sep />

            {/* List */}
            <TBtn
              label={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <line x1="4" y1="3" x2="11" y2="3" />
                  <line x1="4" y1="6" x2="11" y2="6" />
                  <line x1="4" y1="9" x2="11" y2="9" />
                  <circle cx="1.5" cy="3" r="0.8" fill="currentColor" stroke="none" />
                  <circle cx="1.5" cy="6" r="0.8" fill="currentColor" stroke="none" />
                  <circle cx="1.5" cy="9" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              }
              title="Liste à puces"
              onClick={() => {
                toggleLinePrefix("- ");
              }}
            />

            <Sep />

            {/* Link */}
            <TBtn
              label={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                >
                  <path d="M4.5 7.5 L7.5 4.5" />
                  <path d="M3 9 L2 10" />
                  <path d="M5.5 2.5 L7 1 A2.12 2.12 0 0 1 10 4.5 L8 6.5" />
                  <path d="M6.5 9.5 L4.5 11 A2.12 2.12 0 0 1 1 7.5 L3 5.5" />
                </svg>
              }
              title="Lien"
              onClick={() => {
                insertAt("[texte](url)");
              }}
            />

            {/* Image */}
            <TBtn
              label={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                >
                  <rect x="1" y="2" width="10" height="8" rx="1" />
                  <circle cx="4" cy="5" r="1" />
                  <path d="M1 9 L3.5 6.5 L5.5 8.5 L7.5 6 L11 9" />
                </svg>
              }
              title="Image"
              onClick={() => {
                insertAt("![description](https://url-image.jpg)\n");
              }}
            />

            <Sep />

            {/* Code block with lang selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TBtn
                label={
                  <svg
                    width="13"
                    height="12"
                    viewBox="0 0 13 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3,4 1,6 3,8" />
                    <polyline points="10,4 12,6 10,8" />
                    <line x1="5" y1="9" x2="8" y2="3" />
                  </svg>
                }
                title="Bloc de code"
                onClick={() => {
                  insertAt(`\`\`\`${codeLang}\n// code ici\n\`\`\`\n`);
                }}
              />
              <select
                value={codeLang}
                onChange={(e) => {
                  setCodeLang(e.target.value);
                }}
                style={TOOL_SELECT}
              >
                {[
                  "bash",
                  "python",
                  "javascript",
                  "typescript",
                  "sql",
                  "html",
                  "css",
                  "json",
                  "yaml",
                  "go",
                  "rust",
                ].map((l) => (
                  <option key={l} value={l} style={{ background: "var(--color-bg-elevated)" }}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <Sep />

            {/* Callout with type selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TBtn
                label={
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  >
                    <circle cx="6" cy="6" r="5" />
                    <line x1="6" y1="5" x2="6" y2="8" />
                    <circle cx="6" cy="3.5" r="0.6" fill="currentColor" stroke="none" />
                  </svg>
                }
                title="Callout"
                onClick={() => {
                  insertAt(`<Callout type="${calloutType}">\n  Contenu du callout.\n</Callout>\n`);
                }}
              />
              <select
                value={calloutType}
                onChange={(e) => {
                  setCalloutType(e.target.value as "info" | "warning" | "danger" | "success");
                }}
                style={TOOL_SELECT}
              >
                {(["info", "warning", "danger", "success"] as const).map((t) => (
                  <option key={t} value={t} style={{ background: "var(--color-bg-elevated)" }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <Sep />

            {/* Quiz */}
            <TBtn
              label={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                >
                  <circle cx="6" cy="6" r="5" />
                  <path d="M4.5 4.5 C4.5 3.5 7.5 3.5 7.5 5.5 C7.5 6.5 6 6.5 6 7.5" />
                  <circle cx="6" cy="9" r="0.6" fill="currentColor" stroke="none" />
                </svg>
              }
              title="Quiz"
              onClick={() => {
                insertAt(
                  '<Quiz\n  id="q-1"\n  question="Votre question ?"\n  options={["Option A", "Option B", "Option C"]}\n  correct={0}\n/>\n',
                );
              }}
            />

            {/* Sandbox */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TBtn
                label={
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2,4 1,6 2,8" />
                    <polyline points="10,4 11,6 10,8" />
                    <path d="M5 3 L7 3" />
                    <rect x="3" y="2" width="6" height="8" rx="1" />
                  </svg>
                }
                title="Sandbox interactif"
                onClick={() => {
                  const defaultCode = SANDBOX_DEFAULTS[sandboxLang] ?? "";
                  insertAt(
                    `<CodePlayground language="${sandboxLang}" starterCode={\`${defaultCode}\`} />\n`,
                  );
                }}
              />
              <select
                value={sandboxLang}
                onChange={(e) => {
                  setSandboxLang(e.target.value as "python" | "javascript" | "c" | "asm");
                }}
                style={TOOL_SELECT}
              >
                {(["python", "javascript", "c", "asm"] as const).map((l) => (
                  <option key={l} value={l} style={{ background: "var(--color-bg-elevated)" }}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Terminal */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TBtn
                label={
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="1" y="2" width="10" height="8" rx="1" />
                    <polyline points="3,5 5,6 3,7" />
                    <line x1="6" y1="7" x2="9" y2="7" />
                  </svg>
                }
                title="Terminal simulé"
                onClick={() => {
                  insertAt(`<SimulatedTerminal shell="${terminalShell}" />\n`);
                }}
              />
              <select
                value={terminalShell}
                onChange={(e) => {
                  setTerminalShell(e.target.value as "bash" | "powershell");
                }}
                style={TOOL_SELECT}
              >
                {(["bash", "powershell"] as const).map((s) => (
                  <option key={s} value={s} style={{ background: "var(--color-bg-elevated)" }}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <Sep />

            {/* Divider */}
            <TBtn
              label={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line
                    x1="1"
                    y1="6"
                    x2="11"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeDasharray="2 2"
                  />
                </svg>
              }
              title="Séparateur horizontal"
              onClick={() => {
                insertAt("\n---\n\n");
              }}
            />
          </>
        )}

        {/* Right side - guide + split toggle */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              const next = !showGuide;
              // One pane at a time: the guide is in the second one, shown at once.
              if (next) setPane("preview");
              setShowGuide(next);
            }}
            title={showGuide ? "Masquer le guide" : "Guide MDX · référence des composants"}
            aria-pressed={showGuide}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 44,
              padding: "0 12px",
              background: showGuide ? "var(--color-bg-overlay)" : "transparent",
              border: `1px solid ${showGuide ? ACCENT : BORDER}`,
              color: showGuide ? ACCENT : "var(--color-text-secondary)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 140ms ease",
              flexShrink: 0,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              <circle cx="5" cy="5" r="4" />
              <path d="M3.5 4 C3.5 3 6.5 3 6.5 5 C6.5 6 5 6 5 7" />
              <circle cx="5" cy="8.2" r="0.5" fill="currentColor" stroke="none" />
            </svg>
            Guide
          </button>
          {/* Only where both halves fit: narrower, the tabs below take its place. */}
          {wide !== false && (
            <button
              type="button"
              onClick={() => {
                setSplit((v) => !v);
              }}
              title={split ? "Vue éditeur seul" : "Vue scindée"}
              aria-pressed={split}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 44,
                padding: "0 12px",
                background: "transparent",
                border: `1px solid ${split ? ACCENT : BORDER}`,
                color: split ? ACCENT : "var(--color-text-secondary)",
                fontFamily: "var(--font-sans, system-ui, sans-serif)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 140ms ease",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect
                  x="0.5"
                  y="0.5"
                  width="5"
                  height="11"
                  rx="0.5"
                  stroke="currentColor"
                  strokeWidth={1.2}
                />
                <rect
                  x="6.5"
                  y="0.5"
                  width="5"
                  height="11"
                  rx="0.5"
                  stroke="currentColor"
                  strokeWidth={1.2}
                />
              </svg>
              Côte à côte
            </button>
          )}
        </div>
      </div>

      {blocksProblem !== null && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "8px 14px",
            borderBottom: `1px solid color-mix(in srgb, ${DANGER} 33%, transparent)`,
            background: "color-mix(in srgb, var(--color-danger) 7%, transparent)",
            color: "var(--color-text-primary)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: DANGER, fontWeight: 700 }}>Pas de blocs · </b>
          Le MDX ne se découpe pas en blocs : {blocksProblem}. Corrige-le ici, puis réessaie.
        </p>
      )}

      {listed.length > 0 && (
        <div
          role="region"
          aria-label="Problèmes du contenu"
          style={{
            maxHeight: 168,
            overflowY: "auto",
            padding: "6px 14px",
            borderBottom: `1px solid color-mix(in srgb, ${DANGER} 33%, transparent)`,
            background: "color-mix(in srgb, var(--color-danger) 7%, transparent)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: DANGER, fontWeight: 700 }}>À corriger · {listed.length}</b>
          <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0 }}>
            {listed.map((problem, index) => (
              <li
                key={`${String(problem.line)}:${String(problem.column)}:${String(index)}`}
                style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}
              >
                <button
                  type="button"
                  title={`Aller à la ligne ${String(problem.line)}, colonne ${String(problem.column)}`}
                  onClick={() => {
                    openProblem(problem);
                  }}
                  style={{
                    flexShrink: 0,
                    minHeight: 44,
                    minWidth: 44,
                    padding: "0 8px",
                    border: `1px solid ${BORDER}`,
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    fontFamily: MONO,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  L{problem.line}:{problem.column}
                </button>
                <span style={{ color: "var(--color-text-primary)" }}>{problem.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── One pane at a time: the tabs ─────────────────────────────── */}
      {!sideBySide && (
        <PaneTabs
          ids={ids}
          pane={pane}
          secondLabel={showGuide ? "Guide" : "Aperçu"}
          onSelect={setPane}
        />
      )}

      {/* ── Editor + Preview ──────────────────────────────────────────── */}
      <div
        ref={gridRef}
        className="mdx-editor-panes"
        data-split={sideBySide}
        style={{
          display: "grid",
          gridTemplateColumns: sideBySide
            ? `${String(splitPct)}% 7px minmax(0, 1fr)`
            : "minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr)",
          ...(fill ? { flex: 1, minHeight: 0 } : { height, flexShrink: 0 }),
          userSelect: dragging ? "none" : undefined,
        }}
      >
        {/* Blocks, or the Monaco editor. Hidden rather than unmounted behind
            the tabs: Monaco keeps its history, and lays itself out again when
            it is shown (automaticLayout). */}
        <div
          id={ids.editor}
          {...(sideBySide
            ? {}
            : { role: "tabpanel", "aria-labelledby": ids.editorTab, tabIndex: -1 })}
          style={{
            display: showsEditor ? "block" : "none",
            overflow: "hidden",
            height: "100%",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {editorMode === "blocks" ? (
            <BlockEditor value={value} onChange={onChange} />
          ) : (
            <MonacoEditor
              height="100%"
              language="markdown"
              value={value}
              onChange={(v) => {
                onChange(v ?? "");
              }}
              theme={MDX_EDITOR_THEME}
              onMount={handleMount}
              beforeMount={handleBefore}
              options={{
                fontSize: 13,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                fontLigatures: true,
                lineNumbers: "on",
                lineHeight: 21,
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 14, bottom: 14 },
                renderLineHighlight: "line",
                tabSize: 2,
                overviewRulerLanes: 0,
                renderWhitespace: "none",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                suggestOnTriggerCharacters: false,
                quickSuggestions: false,
                folding: false,
                bracketPairColorization: { enabled: true },
                stickyScroll: { enabled: false },
              }}
            />
          )}
        </div>

        {/* The separator: dragged, or moved with the arrow keys once focused */}
        {sideBySide && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Largeur de l'éditeur et de l'aperçu"
            aria-valuemin={SPLIT_MIN}
            aria-valuemax={SPLIT_MAX}
            aria-valuenow={Math.round(splitPct)}
            tabIndex={0}
            title="Glisser pour élargir l'éditeur ou l'aperçu · double-clic : largeur par défaut"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
            }}
            onPointerMove={(event) => {
              if (!dragging || !gridRef.current) return;
              const box = gridRef.current.getBoundingClientRect();
              moveSplit(splitAt(event.clientX, box.left, box.width), false);
            }}
            onPointerUp={(event) => {
              if (!dragging) return;
              event.currentTarget.releasePointerCapture(event.pointerId);
              setDragging(false);
              storeSplit(splitPct);
            }}
            onDoubleClick={() => {
              moveSplit(SPLIT_DEFAULT, true);
            }}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowLeft"
                  ? splitPct - SPLIT_STEP
                  : event.key === "ArrowRight"
                    ? splitPct + SPLIT_STEP
                    : event.key === "Home"
                      ? SPLIT_MIN
                      : event.key === "End"
                        ? SPLIT_MAX
                        : null;
              if (next === null) return;
              event.preventDefault();
              moveSplit(next, true);
            }}
            style={{
              cursor: "col-resize",
              touchAction: "none",
              background: dragging
                ? "color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)"
                : "transparent",
              borderLeft: `1px solid ${BORDER}`,
              borderRight: `1px solid ${BORDER}`,
              outlineOffset: -2,
            }}
          />
        )}

        {/* Guide / the site's preview / the quick preview. Deaf to the pointer
            while the separator moves: the site's frame would take the drag. */}
        {previewMounted && (
          <div
            id={ids.preview}
            {...(sideBySide
              ? {}
              : { role: "tabpanel", "aria-labelledby": ids.previewTab, tabIndex: -1 })}
            style={{
              display: showsPreview ? "block" : "none",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              pointerEvents: dragging ? "none" : undefined,
            }}
          >
            {showGuide ? (
              <MdxGuide onInsert={insertAt} />
            ) : sitePreview ? (
              <MdxPreviewFrame
                value={value}
                preview={preview}
                onQuick={() => {
                  setPreviewMode("quick");
                }}
                onProblems={setShown}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  overflow: "auto",
                  padding: "16px 20px 32px",
                  background: "var(--color-bg-elevated)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans, system-ui, sans-serif)",
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <b style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    Aperçu rapide
                  </b>
                  <span style={{ marginLeft: "auto" }}>approximation · 350 ms</span>
                  {preview !== undefined && (
                    <PaneButton
                      title="L'aperçu du site : la leçon rendue par le site, avec ses vrais composants"
                      onClick={() => {
                        setPreviewMode("site");
                      }}
                    >
                      Site
                    </PaneButton>
                  )}
                </div>
                <MdxPreview content={quickPreview} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────── */}
      <div
        className="mdx-editor-status"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "6px 14px",
          background: "var(--color-bg-elevated)",
          borderTop: `1px solid ${BORDER}`,
          fontFamily: "var(--font-sans, system-ui, sans-serif)",
          fontSize: 12,
          color: "var(--color-text-muted)",
          flexShrink: 0,
        }}
      >
        <span>MDX · UTF-8 · LF</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <span>
            <b style={{ color: "var(--color-text-secondary)", fontFamily: MONO }}>{lineCount}</b>{" "}
            lignes
          </span>
          <span>
            <b style={{ color: "var(--color-text-secondary)", fontFamily: MONO }}>{charCount}</b>{" "}
            car.
          </span>
        </span>
      </div>
    </div>
  );
}
