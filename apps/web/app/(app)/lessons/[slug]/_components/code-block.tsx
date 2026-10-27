"use client";

import { useRef } from "react";
import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/components/copy-button";

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
  const { copied, copy } = useCopyToClipboard();

  let language = "code";
  if (children !== null && typeof children === "object" && "props" in (children as object)) {
    // SAFETY: children is the <code> element rendered by MDX
    const codeEl = children as { props?: { className?: string } };
    const cls = codeEl.props?.className ?? "";
    const match = /language-(\w+)/.exec(cls);
    if (match?.[1]) language = match[1];
  }

  function handleCopy(): void {
    copy(ref.current?.textContent ?? "");
  }

  const displayName = filename ?? language;

  return (
    <div className="lesson-code">
      {/* Header: the file or the language, as data, and the copy button. */}
      <div className="lesson-code__head">
        <div className="lesson-code__name">
          <span className="lesson-code__file">{displayName}</span>
          {variant === "danger" && <span className="lesson-code__danger">Danger</span>}
          {language !== "code" && filename && <span className="lesson-code__lang">{language}</span>}
        </div>

        <button
          type="button"
          className="lesson-code-copy"
          data-copied={copied}
          onClick={handleCopy}
          aria-label="Copier le code"
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
        </button>
      </div>

      {/* Code block: its whole look is here. The lesson's stylesheet once
          forced the padding and the background on every <pre> with
          !important, which hid the terminal-theme cosmetic below. */}
      <pre
        ref={ref}
        {...rest}
        style={{
          margin: 0,
          // terminal-theme cosmetic drives the code surface background
          background: "var(--cosmetic-terminal-bg)",
          border: "1px solid #303137",
          borderLeft: "3px solid var(--cosmetic-accent)",
          borderRadius: 0,
          padding: "16px 20px",
          overflowX: "auto",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
        }}
      >
        {children}
      </pre>
    </div>
  );
}
