"use client";

// Client boundary: the copy button writes to the clipboard.

import React, { useMemo, useState } from "react";
import { codeLanguage, highlightLines } from "@/lib/notes/highlight";

/**
 * A fenced block of a note: its language on a header bar, a copy button, the
 * code coloured by scope (rich-note.css) with line numbers. The tokens are
 * text; nothing in the block is ever read as markup.
 */
export function RichCodeBlock({ lang, code }: { lang: string; code: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => highlightLines(code, lang), [code, lang]);
  const known = codeLanguage(lang);
  const label = lang ? lang : "code";

  return (
    <figure className="rnote-code" data-lang={known ?? undefined}>
      <figcaption className="rnote-code__bar">
        <span className="rnote-code__lang">{label}</span>
        <button
          type="button"
          className="rnote-code__copy"
          onClick={() => {
            void navigator.clipboard
              .writeText(code)
              .then(() => {
                setCopied(true);
                window.setTimeout(() => {
                  setCopied(false);
                }, 1600);
              })
              .catch(() => {
                setCopied(false);
              });
          }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </figcaption>
      <pre>
        <code>
          {lines.map((line, i) => (
            // A line has no identity beyond its place in the block.
            <span key={i} className="rnote-code__line">
              {line.length === 0
                ? "\n"
                : line.map((token, j) =>
                    token.scope ? (
                      <span key={j} className={`tok-${token.scope}`}>
                        {token.text}
                      </span>
                    ) : (
                      <React.Fragment key={j}>{token.text}</React.Fragment>
                    ),
                  )}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
