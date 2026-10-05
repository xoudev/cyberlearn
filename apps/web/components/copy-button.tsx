"use client";

// "use client" justification: the clipboard, and the two seconds the button
// says it worked.

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copies to the clipboard and says so for a moment. Written three times
 * before (a challenge's flag, a code block, the recap's link), each with its
 * own timer; the hook is the one copy, the button the usual look of it.
 */
export function useCopyToClipboard(resetAfterMs = 2000): {
  copied: boolean;
  copy: (text: string) => void;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          if (timer.current !== null) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setCopied(false);
          }, resetAfterMs);
        })
        .catch(() => {
          // No clipboard here: the button simply does not light up.
        });
    },
    [resetAfterMs],
  );
  return { copied, copy };
}

export function CopyButton({
  text,
  label = "copier",
  copiedLabel = "✓ copié",
  ariaLabel,
}: {
  /** What to copy, or how to get it at the moment of the click. */
  text: string | (() => string);
  label?: string;
  copiedLabel?: string;
  ariaLabel?: string;
}): React.ReactElement {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      onClick={() => {
        copy(typeof text === "function" ? text() : text);
      }}
      aria-label={ariaLabel}
      className={`copy-button${copied ? " copy-button--copied" : ""}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
