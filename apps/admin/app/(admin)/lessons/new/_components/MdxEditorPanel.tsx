"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { OnMount, BeforeMount } from "@monaco-editor/react";

type EditorInstance = Parameters<OnMount>[0];

// ── Dynamic import — Monaco has no SSR support ─────────────────────────────────
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        background: "#07051E",
        display: "grid",
        placeItems: "center",
        color: "#3F3D5C",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
      }}
    >
      {"// chargement éditeur…"}
    </div>
  ),
});

// ── Tokens ─────────────────────────────────────────────────────────────────────
const BORDER = "#2A2560";
const TURQ = "#0AFFD4";
const MONO = "var(--font-mono)";
const DANGER = "#FF4D6D";

// ── Preview — inline markdown renderer ────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} style={{ color: "#F5F5FA", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return (
        <em key={i} style={{ color: "#D0CDEC" }}>
          {part.slice(1, -1)}
        </em>
      );
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          style={{
            fontFamily: MONO,
            background: "#1A1740",
            color: TURQ,
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: "0.88em",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (lm)
      return (
        <span key={i} style={{ color: "#4D8BFF", textDecoration: "underline", cursor: "pointer" }}>
          {lm[1]}
        </span>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function parseProps(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)=["']([^"']*?)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[1] && m[2] !== undefined) out[m[1]] = m[2];
  }
  return out;
}

function PreviewComponent({ source }: { source: string }): React.ReactElement {
  const nameMatch = /^<([A-Z]\w*)/.exec(source);
  const name = nameMatch?.[1] ?? "Unknown";
  const propsStr = /^<[A-Z]\w*\s+([\s\S]*?)[\s/>]/.exec(source)?.[1] ?? "";
  const props = parseProps(propsStr);
  const inner = />([^<]*)<\/[A-Z]/.exec(source)?.[1]?.trim() ?? "";

  if (name === "Callout") {
    const type = props.type ?? "info";
    const meta: Record<string, { border: string; bg: string; color: string; label: string }> = {
      info: { border: "#4D8BFF", bg: "rgba(77,139,255,0.08)", color: "#4D8BFF", label: "INFO" },
      warning: {
        border: "#FFB020",
        bg: "rgba(255,176,32,0.08)",
        color: "#FFB020",
        label: "ATTENTION",
      },
      danger: { border: DANGER, bg: "rgba(255,77,109,0.08)", color: DANGER, label: "DANGER" },
      success: { border: TURQ, bg: "rgba(10,255,212,0.08)", color: TURQ, label: "SUCCÈS" },
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
          border: `1px solid ${c.border}44`,
          borderLeft: `3px solid ${c.border}`,
          borderRadius: "0 6px 6px 0",
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
        <p style={{ margin: 0, fontSize: 13, color: "#B8B5D1", lineHeight: 1.65 }}>
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
          background: "#0A0826",
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#6B6890",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          QUIZ · {props.id ?? "?"}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#F5F5FA", fontWeight: 600 }}>
          {props.question ?? "Question…"}
        </p>
        {props.options && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6B6890", fontFamily: MONO }}>
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
          background: "#060422",
          border: `1px solid #1F1B47`,
          borderLeft: `3px solid ${TURQ}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "5px 14px",
            borderBottom: "1px solid #1F1B47",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              color: TURQ,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {lang}
          </span>
          {name === "CodePlayground" && (
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "#4D8BFF" }}>
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
            color: "#6B6890",
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
          background: "#060422",
          border: `1px dashed ${BORDER}`,
          borderRadius: 6,
          textAlign: "center",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 11, color: "#6B6890" }}>
          🖼 {props.alt ?? props.src ?? "image"}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "10px 0",
        padding: "8px 12px",
        background: "rgba(77,139,255,0.05)",
        border: `1px solid rgba(77,139,255,0.18)`,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 9, color: "#4D8BFF", letterSpacing: "0.1em" }}>
        COMPOSANT
      </span>
      <code style={{ fontFamily: MONO, fontSize: 11, color: "#6B6890" }}>&lt;{name}&gt;</code>
    </div>
  );
}

function MdxPreview({ content }: { content: string }): React.ReactElement {
  const body = content
    .replace(/^---[\s\S]*?---\n?/, "")
    // Strip MDX/JS import declarations only (require 'from "…"' or bare import "…"')
    // Bare Python/etc. imports like `import hashlib` inside code blocks are preserved.
    .replace(/^import\s+.*\s+from\s+['"][^'"]+['"].*$/gm, "")
    .replace(/^import\s+['"][^'"]+['"].*$/gm, "");

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
            color: "#F5F5FA",
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
            color: "#F5F5FA",
            margin: "24px 0 10px",
            paddingLeft: 14,
            borderLeft: "3px solid #0AFFD4",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "#3F3D5C",
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
            color: "#B8B5D1",
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
            background: "#060422",
            border: `1px solid #1F1B47`,
            borderLeft: `3px solid ${TURQ}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "5px 14px", borderBottom: "1px solid #1F1B47" }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: TURQ,
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
              color: "#B8B5D1",
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
                color: "#B8B5D1",
                fontSize: 13,
                lineHeight: 1.7,
                marginBottom: 3,
                display: "flex",
                gap: 8,
              }}
            >
              <span style={{ color: TURQ, flexShrink: 0, marginTop: 1 }}>›</span>
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
        <p key={k++} style={{ color: "#B8B5D1", fontSize: 15, lineHeight: 1.75, margin: "10px 0" }}>
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
          color: "#3F3D5C",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.08em",
        }}
      >
        {"// commencez à écrire du MDX…"}
      </div>
    );
  }

  return <div style={{ fontFamily: "var(--font-sans)", color: "#B8B5D1" }}>{elements}</div>;
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
      onClick={onClick}
      onMouseEnter={() => {
        setHov(true);
      }}
      onMouseLeave={() => {
        setHov(false);
      }}
      style={{
        height: 26,
        minWidth: 28,
        padding: "0 7px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active || hov ? "rgba(255,255,255,0.06)" : "transparent",
        border: active ? `1px solid ${BORDER}` : "1px solid transparent",
        borderRadius: 3,
        color: active ? TURQ : hov ? "#F5F5FA" : "#6B6890",
        fontFamily: mono ? MONO : "inherit",
        fontWeight: mono ? 700 : 400,
        fontSize: 12,
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
    <span style={{ width: 1, height: 14, background: BORDER, flexShrink: 0, margin: "0 4px" }} />
  );
}

// ── MDX Authoring Guide ─────────────────────────────────────────────────────────

interface GuideEntry {
  label: string;
  snippet: string;
  description?: string;
}

interface GuideSection {
  title: string;
  accent: string;
  entries: GuideEntry[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Markdown",
    accent: "#6B6890",
    entries: [
      { label: "H1", snippet: "# Titre principal\n" },
      { label: "H2", snippet: "## Section\n" },
      { label: "H3", snippet: "### Sous-section\n" },
      { label: "Gras", snippet: "**texte en gras**" },
      { label: "Italique", snippet: "*texte en italique*" },
      { label: "Code", snippet: "`code inline`" },
      { label: "Liste", snippet: "- Élément 1\n- Élément 2\n- Élément 3\n" },
      { label: "Lien", snippet: "[texte](https://example.com)" },
      { label: "Image", snippet: "![description](https://url-image.jpg)\n" },
      { label: "HR", snippet: "\n---\n\n" },
      { label: "Bloc code", snippet: "```python\n# code ici\nprint('Hello')\n```\n" },
    ],
  },
  {
    title: "Callout",
    accent: "#4D8BFF",
    entries: [
      {
        label: "info",
        snippet: '<Callout type="info">\n  Texte informatif pour l\'étudiant.\n</Callout>\n',
      },
      {
        label: "warning",
        snippet: '<Callout type="warning">\n  Point d\'attention important.\n</Callout>\n',
      },
      {
        label: "danger",
        snippet: '<Callout type="danger">\n  Erreur ou pratique à éviter absolument.\n</Callout>\n',
      },
      {
        label: "success",
        snippet: '<Callout type="success">\n  Bonne pratique ou résultat attendu.\n</Callout>\n',
      },
    ],
  },
  {
    title: "Quiz",
    accent: "#FFB020",
    entries: [
      {
        label: "QCM",
        snippet:
          '<Quiz\n  id="q-1"\n  question="Quelle commande liste les fichiers ?"\n  options={["ls", "cd", "pwd", "rm"]}\n  correct={0}\n/>\n',
      },
    ],
  },
  {
    title: "CodePlayground",
    accent: "#0AFFD4",
    entries: [
      {
        label: "Python",
        snippet: '<CodePlayground language="python">\nprint("Hello, World!")\n</CodePlayground>\n',
        description: "Pyodide · WASM · Python 3.11",
      },
      {
        label: "JavaScript",
        snippet:
          '<CodePlayground language="javascript">\nconsole.log("Hello, World!");\n</CodePlayground>\n',
        description: "Web Worker · ES2022",
      },
      {
        label: "C",
        snippet:
          '<CodePlayground language="c">\n#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n</CodePlayground>\n',
        description: "jscpp · C11 standard",
      },
      {
        label: "ASM x86-64",
        snippet:
          '<CodePlayground language="asm">\nglobal main\nsection .text\nmain:\n    mov rax, 42\n    println rax\n    ret\n</CodePlayground>\n',
        description: "Simulateur NASM · mov add sub push pop cmp jmp call ret",
      },
    ],
  },
  {
    title: "SimulatedTerminal",
    accent: "#B14DFF",
    entries: [
      {
        label: "bash",
        snippet: '<SimulatedTerminal shell="bash" />\n',
        description: "ls · pwd · whoami · cat · echo · mkdir · clear · help",
      },
      {
        label: "bash-admin",
        snippet: '<SimulatedTerminal shell="bash" scenario="bash-admin" />\n',
        description: "ps aux · df -h · free -h · ss -tlnp · systemctl · journalctl · who",
      },
      {
        label: "bash-scripting",
        snippet: '<SimulatedTerminal shell="bash" scenario="bash-scripting" />\n',
        description: "cat script.sh · bash -n · chmod +x · history · echo $SHELL",
      },
      {
        label: "ps-basics",
        snippet: '<SimulatedTerminal shell="powershell" scenario="powershell-basics" />\n',
        description: "Get-ChildItem · Get-Date · $PSVersionTable · Get-Process",
      },
      {
        label: "ps-sec",
        snippet: '<SimulatedTerminal shell="powershell" scenario="powershell-sec" />\n',
        description: "Get-LocalUser · Get-NetTCPConnection · Get-WinEvent · netstat -ano",
      },
    ],
  },
];

const SANDBOX_DEFAULTS: Record<string, string> = {
  python: 'print("Hello, World!")',
  javascript: 'console.log("Hello, World!");',
  c: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
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
    <div style={{ borderBottom: "1px solid rgba(31,27,71,0.45)", padding: "5px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <code
          style={{
            flex: 1,
            fontFamily: MONO,
            fontSize: 10.5,
            color: "#44406B",
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
            height: 20,
            padding: "0 8px",
            border: `1px solid ${done ? "rgba(10,255,212,0.4)" : hov ? `${accent}66` : "rgba(31,27,71,0.8)"}`,
            background: done ? "rgba(10,255,212,0.1)" : hov ? `${accent}11` : "transparent",
            color: done ? "#0AFFD4" : hov ? accent : "#6B6890",
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
            borderRadius: 2,
            transition: "all 120ms ease",
          }}
        >
          {done ? "✓" : entry.label}
        </button>
      </div>
      {entry.description && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#3F3D5C",
            letterSpacing: "0.04em",
            marginTop: 2,
          }}
        >
          {entry.description}
        </div>
      )}
    </div>
  );
}

function MdxGuide({ onInsert }: { onInsert: (s: string) => void }): React.ReactElement {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#060422" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: "#3F3D5C",
          letterSpacing: "0.12em",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid rgba(31,27,71,0.6)",
          position: "sticky",
          top: 0,
          background: "#060422",
          zIndex: 1,
        }}
      >
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: TURQ,
            display: "inline-block",
            boxShadow: `0 0 6px ${TURQ}`,
          }}
        />
        GUIDE MDX
        <span style={{ marginLeft: "auto", color: "#2A2560" }}>
          clic → insérer dans l&apos;éditeur
        </span>
      </div>
      <div style={{ padding: "4px 16px 32px" }}>
        {GUIDE_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: section.accent,
                  flexShrink: 0,
                  boxShadow: `0 0 5px ${section.accent}88`,
                }}
              />
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: section.accent,
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(31,27,71,0.5)" }} />
            </div>
            {section.entries.map((entry) => (
              <GuideRow
                key={entry.label}
                entry={entry}
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

// ── Monaco theme (defined once) ────────────────────────────────────────────────

const THEME_DEFINED = { current: false };

function defineTheme(monaco: Parameters<BeforeMount>[0]) {
  if (THEME_DEFINED.current) return;
  THEME_DEFINED.current = true;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  monaco.editor.defineTheme("cyberlearn", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "6E8BFF" },
      { token: "string", foreground: "0AFFD4" },
      { token: "comment", foreground: "44406B", fontStyle: "italic" },
      { token: "number", foreground: "FFB020" },
      { token: "tag", foreground: "FF6B9D" },
      { token: "attribute.name", foreground: "FFB020" },
      { token: "attribute.value", foreground: "0AFFD4" },
      { token: "markup.heading", foreground: "F5F5FA", fontStyle: "bold" },
      { token: "markup.bold", foreground: "F5F5FA", fontStyle: "bold" },
      { token: "markup.italic", foreground: "D0CDEC", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#07051E",
      "editor.foreground": "#B8B5D1",
      "editor.lineHighlightBackground": "#0A0826",
      "editor.selectionBackground": "#2A256088",
      "editorLineNumber.foreground": "#3F3D5C",
      "editorLineNumber.activeForeground": "#6B6890",
      "editorCursor.foreground": TURQ,
      "editorIndentGuide.background1": "#1F1B47",
      "scrollbarSlider.background": "#2A256066",
      "scrollbarSlider.hoverBackground": "#44406B88",
      "editorWidget.background": "#0A0826",
      "editorWidget.border": BORDER,
      "editorSuggestWidget.background": "#0A0826",
      "input.background": "#07051E",
      "input.border": BORDER,
    },
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MdxEditorPanelProps {
  value: string;
  onChange: (v: string) => void;
}

export function MdxEditorPanel({ value, onChange }: MdxEditorPanelProps): React.ReactElement {
  const editorRef = useRef<EditorInstance | null>(null);
  const [split, setSplit] = useState(true);
  const [codeLang, setCodeLang] = useState("bash");
  const [calloutType, setCalloutType] = useState<"info" | "warning" | "danger" | "success">("info");
  const [sandboxLang, setSandboxLang] = useState<"python" | "javascript" | "c" | "asm">("python");
  const [terminalShell, setTerminalShell] = useState<"bash" | "powershell">("bash");
  const [preview, setPreview] = useState(value);
  const [showGuide, setShowGuide] = useState(false);

  // Debounced preview update
  useEffect(() => {
    const t = setTimeout(() => {
      setPreview(value);
    }, 350);
    return () => {
      clearTimeout(t);
    };
  }, [value]);

  const lineCount = value.split("\n").length;
  const charCount = value.length;

  const handleMount = useCallback<OnMount>((editor) => {
    editorRef.current = editor;
  }, []);
  const handleBefore = useCallback<BeforeMount>((monaco) => {
    defineTheme(monaco);
  }, []);

  // Insert raw text at cursor
  const insertAt = useCallback((text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = ed.getSelection();
    if (!sel) return;
    ed.executeEdits("toolbar", [{ range: sel, text, forceMoveMarkers: true }]);
    ed.focus();
  }, []);

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
    <div style={{ border: `1px solid ${BORDER}`, overflow: "hidden", background: "#07051E" }}>
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "#050416",
          borderBottom: `1px solid ${BORDER}`,
          height: 40,
          padding: "0 10px",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
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
            style={{
              height: 22,
              background: "#0A0826",
              border: `1px solid ${BORDER}`,
              color: "#6B6890",
              fontFamily: MONO,
              fontSize: 9,
              cursor: "pointer",
              padding: "0 4px",
              outline: "none",
              borderRadius: 2,
            }}
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
              <option key={l} value={l} style={{ background: "#0A0826" }}>
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
            style={{
              height: 22,
              background: "#0A0826",
              border: `1px solid ${BORDER}`,
              color: "#6B6890",
              fontFamily: MONO,
              fontSize: 9,
              cursor: "pointer",
              padding: "0 4px",
              outline: "none",
              borderRadius: 2,
            }}
          >
            {(["info", "warning", "danger", "success"] as const).map((t) => (
              <option key={t} value={t} style={{ background: "#0A0826" }}>
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
                `<CodePlayground language="${sandboxLang}">\n${defaultCode}\n</CodePlayground>\n`,
              );
            }}
          />
          <select
            value={sandboxLang}
            onChange={(e) => {
              setSandboxLang(e.target.value as "python" | "javascript" | "c" | "asm");
            }}
            style={{
              height: 22,
              background: "#0A0826",
              border: `1px solid ${BORDER}`,
              color: "#6B6890",
              fontFamily: MONO,
              fontSize: 9,
              cursor: "pointer",
              padding: "0 4px",
              outline: "none",
              borderRadius: 2,
            }}
          >
            {(["python", "javascript", "c", "asm"] as const).map((l) => (
              <option key={l} value={l} style={{ background: "#0A0826" }}>
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
            style={{
              height: 22,
              background: "#0A0826",
              border: `1px solid ${BORDER}`,
              color: "#6B6890",
              fontFamily: MONO,
              fontSize: 9,
              cursor: "pointer",
              padding: "0 4px",
              outline: "none",
              borderRadius: 2,
            }}
          >
            {(["bash", "powershell"] as const).map((s) => (
              <option key={s} value={s} style={{ background: "#0A0826" }}>
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

        {/* Right side — guide + split toggle */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              const next = !showGuide;
              if (next && !split) setSplit(true);
              setShowGuide(next);
            }}
            title={showGuide ? "Masquer le guide" : "Guide MDX · référence des composants"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 26,
              padding: "0 9px",
              background: showGuide ? "rgba(77,139,255,0.08)" : "transparent",
              border: `1px solid ${showGuide ? "rgba(77,139,255,0.3)" : BORDER}`,
              borderRadius: 3,
              color: showGuide ? "#4D8BFF" : "#6B6890",
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.1em",
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
            GUIDE
          </button>
          <button
            type="button"
            onClick={() => {
              setSplit((v) => !v);
            }}
            title={split ? "Vue éditeur seul" : "Vue scindée"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 26,
              padding: "0 9px",
              background: split ? "rgba(10,255,212,0.08)" : "transparent",
              border: `1px solid ${split ? "rgba(10,255,212,0.3)" : BORDER}`,
              borderRadius: 3,
              color: split ? TURQ : "#6B6890",
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.1em",
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
            SPLIT
          </button>
        </div>
      </div>

      {/* ── Editor + Preview ──────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: split ? "55% 45%" : "1fr",
          height: 620,
        }}
      >
        {/* Monaco editor */}
        <div
          style={{
            borderRight: split ? `1px solid ${BORDER}` : "none",
            overflow: "hidden",
            height: 620,
          }}
        >
          <MonacoEditor
            height="620px"
            language="markdown"
            value={value}
            onChange={(v) => {
              onChange(v ?? "");
            }}
            theme="cyberlearn"
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
        </div>

        {/* Live preview / Guide */}
        {split &&
          (showGuide ? (
            <MdxGuide onInsert={insertAt} />
          ) : (
            <div
              style={{
                height: 620,
                overflow: "auto",
                padding: "16px 20px 32px",
                background: "#060422",
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: "#3F3D5C",
                  letterSpacing: "0.12em",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: TURQ,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${TURQ}`,
                  }}
                />
                PREVIEW
                <span style={{ marginLeft: "auto", color: "#2A2560" }}>350ms debounce</span>
              </div>
              <MdxPreview content={preview} />
            </div>
          ))}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "5px 14px",
          background: "#050416",
          borderTop: `1px solid ${BORDER}`,
          fontFamily: MONO,
          fontSize: 9.5,
          letterSpacing: "0.08em",
          color: "#6B6890",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: TURQ }}>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: TURQ,
              display: "inline-block",
            }}
          />
          MDX
        </span>
        <span>UTF-8</span>
        <span>LF</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <span>
            <b style={{ color: "#B8B5D1" }}>{lineCount}</b> lignes
          </span>
          <span>
            <b style={{ color: "#B8B5D1" }}>{charCount}</b> car.
          </span>
        </span>
      </div>
    </div>
  );
}
