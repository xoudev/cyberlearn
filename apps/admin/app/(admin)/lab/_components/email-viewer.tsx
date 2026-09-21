"use client";

import React, { useState } from "react";
import type { EmailSample } from "@cyberlearn/email";
import { UI } from "../../_components/admin-ui";

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
    <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 260px) 1fr", gap: 16 }}>
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
              padding: "8px 10px",
              background: s.key === active ? UI.surfaceDeep : "transparent",
              border: `1px solid ${s.key === active ? UI.borderStrong : "transparent"}`,
              color: s.key === active ? UI.fg : UI.fg2,
              cursor: "pointer",
              font: `600 13px ${UI.sans}`,
            }}
          >
            {s.label}
            <span style={{ display: "block", font: `400 11px ${UI.mono}`, color: UI.muted }}>
              {s.when}
            </span>
          </button>
        ))}
      </nav>

      <div style={{ display: "grid", gap: 8 }}>
        <p className="a-field-hint" style={{ margin: 0 }}>
          Mise en page et contenu fidèles. Les polices, elles, ne se chargent pas ici — la console
          bloque les polices distantes. La plupart des clients mail les bloquent aussi, donc ce
          repli est proche de ce que voit le destinataire.
        </p>
        {current !== undefined && (
          <iframe
            // sandbox with nothing granted: the markup is ours, and a preview
            // pane is not a reason to let a template run anything.
            sandbox=""
            title={`Aperçu · ${current.label}`}
            srcDoc={current.html}
            style={{
              width: "100%",
              height: 620,
              border: `1px solid ${UI.border}`,
              background: "#fff",
            }}
          />
        )}
      </div>
    </div>
  );
}
