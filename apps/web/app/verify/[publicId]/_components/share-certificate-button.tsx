"use client";

// "use client" justification: the clipboard, and the moment the button says
// the link was copied.

import React from "react";
import { useCopyToClipboard } from "@/components/copy-button";

/**
 * "Partager" on a certificate's public page: copies the page's address, which
 * is all somebody needs to check the certificate. The button used to have no
 * handler at all.
 */
export function ShareCertificateButton({ url }: { url: string }): React.ReactElement {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      className="btn btn--ghost btn--lg"
      type="button"
      title="Copier le lien de cette page"
      onClick={() => {
        copy(url);
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="4" cy="8" r="2" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M5.7 7 L10.3 4.6 M5.7 9 L10.3 11.4" />
      </svg>
      <span aria-live="polite">{copied ? "Lien copié" : "Partager"}</span>
    </button>
  );
}
