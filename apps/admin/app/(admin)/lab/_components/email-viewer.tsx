"use client";

import React, { useState } from "react";
import type { EmailSample } from "@cyberlearn/email";

/**
 * The nine templates, side by side with what they look like.
 *
 * In an iframe, and that is the point rather than an implementation detail: an
 * e-mail carries its own styles, written for mail clients, and dropping that
 * markup into the console would let the console's stylesheet repaint it. What
 * is shown here has to be what leaves the server.
 *
 * Every template was rendered on the server before this component was handed
 * them. Nothing is sent, and no address is touched.
 */

export function EmailViewer({
  samples,
}: {
  samples: (EmailSample & { html: string })[];
}): React.JSX.Element {
  const [active, setActive] = useState(samples[0]?.key ?? "");
  const current = samples.find((s) => s.key === active) ?? samples[0];

  return (
    <div className="a-email-viewer">
      <nav style={{ display: "grid", gap: 4, alignContent: "start" }}>
        {samples.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setActive(s.key);
            }}
            style={{
              textAlign: "left",
              minHeight: 44,
              padding: "8px 10px",
              background: s.key === active ? "var(--a-surface-2)" : "transparent",
              border: `1px solid ${s.key === active ? "var(--a-border-2)" : "transparent"}`,
              color: s.key === active ? "var(--a-fg)" : "var(--a-fg-2)",
              cursor: "pointer",
              font: "600 13px var(--font-sans)",
            }}
          >
            {s.label}
            <span
              style={{
                display: "block",
                font: "400 12px var(--font-sans)",
                color: "var(--a-muted)",
              }}
            >
              {s.when}
            </span>
          </button>
        ))}
      </nav>

      <div style={{ display: "grid", gap: 8 }}>
        <p className="a-field-hint" style={{ margin: 0 }}>
          Le logo et le lettrage utilisent la même image que les mails envoyés. Les autres polices
          peuvent être remplacées par celles du client mail ; cet aperçu montre ce rendu de repli.
        </p>
        {current !== undefined && (
          <iframe
            // sandbox with nothing granted: the markup is ours, and a preview
            // pane is not a reason to let a template run anything.
            sandbox=""
            title={`Aperçu · ${current.label}`}
            srcDoc={current.html}
            className="a-mail-frame"
          />
        )}
      </div>
    </div>
  );
}
