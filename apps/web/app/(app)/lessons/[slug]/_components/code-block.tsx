"use client";

import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
  /** Display path/filename in header, e.g. "~/auth/login.py" */
  filename?: string;
  /** "danger" shows a red DANGER badge - use for vulnerable code examples */
  variant?: "default" | "danger";
}

export function CodeBlock({
  children,
  filename,
  variant = "default",
  ...rest
}: CodeBlockProps): React.ReactElement {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  let language = "code";
  if (children !== null && typeof children === "object" && "props" in (children as object)) {
    // SAFETY: children is the <code> element rendered by MDX
    const codeEl = children as { props?: { className?: string } };
    const cls = codeEl.props?.className ?? "";
    const match = /language-(\w+)/.exec(cls);
    if (match?.[1]) language = match[1];
  }

  async function handleCopy() {
    const text = ref.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // clipboard API not available
    }
  }

  const displayName = filename ?? language;

  return (
    <div style={{ margin: "1.5rem 0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "7px 16px",
          background: "rgba(5,4,26,0.85)",
          border: "1px solid #2A2560",
          borderLeft: "3px solid var(--cosmetic-accent)",
          borderBottom: "none",
        }}
      >
        {/* Left: filename + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              color: "#B8B5D1",
              letterSpacing: "0.03em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          {variant === "danger" && (
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#FF4757",
                padding: "2px 7px",
                border: "1px solid rgba(255,71,87,0.3)",
                background: "rgba(255,71,87,0.07)",
                flexShrink: 0,
              }}
            >
              DANGER
            </span>
          )}
          {language !== "code" && filename && (
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#3F3D5C",
                flexShrink: 0,
              }}
            >
              {language}
            </span>
          )}
        </div>

        {/* Right: copy button */}
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied ? "#0AFFD4" : "#44406B",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: 0,
            flexShrink: 0,
            transition: "color 150ms ease",
          }}
          aria-label="Copier le code"
        >
          {copied ? <Check size={9} aria-hidden /> : <Copy size={9} aria-hidden />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>

      {/* Code block */}
      <pre
        ref={ref}
        {...rest}
        style={{
          margin: 0,
          // terminal-theme cosmetic drives the code surface background
          background: "var(--cosmetic-terminal-bg)",
          border: "1px solid #2A2560",
          borderLeft: "3px solid var(--cosmetic-accent)",
          borderRadius: 0,
          padding: "16px 20px",
        }}
      >
        {children}
      </pre>
    </div>
  );
}
