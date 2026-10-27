import React from "react";

type CalloutType = "info" | "warning" | "danger" | "tip" | "note";

/**
 * Each type's colour, kept for its meaning: the stripe on the left and the
 * icon's square. The box itself is the same panel for every type, flat, so
 * that a lesson with four callouts does not turn into four tints.
 */
const VARIANTS: Record<CalloutType, { color: string; icon: string }> = {
  info: { color: "var(--color-info)", icon: "i" },
  tip: { color: "var(--cosmetic-accent)", icon: "✓" },
  warning: { color: "var(--color-warning)", icon: "!" },
  danger: { color: "var(--color-category-cybersec)", icon: "✕" },
  note: { color: "#74767d", icon: "·" },
};

export interface CalloutProps {
  // MDX authors pass an arbitrary string; unknown/casing variants fall back to "info".
  type?: string;
  title?: string;
  children?: React.ReactNode;
}

function resolveVariant(type: string): CalloutType {
  const t = type.toLowerCase();
  return t === "tip" || t === "warning" || t === "danger" || t === "note" ? t : "info";
}

export function Callout({ type = "info", title, children }: CalloutProps): React.JSX.Element {
  const v = VARIANTS[resolveVariant(type)];

  return (
    <div
      className="lesson-callout"
      style={{
        // The shorthand first: written after, it took the accent back to 1px.
        border: "1px solid #303137",
        borderLeft: `3px solid ${v.color}`,
      }}
    >
      <div aria-hidden="true" className="lesson-callout__icon" style={{ color: v.color }}>
        {v.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div className="lesson-callout__title" style={{ color: v.color }}>
            {title}
          </div>
        )}
        {/* What the author wrote: paragraphs, lists, inline code. The class
            gives its links, bold, code and lists the lesson's look, at the
            callout's size (globals.css, with the box's own layout). */}
        <div className="lesson-callout__body">{children}</div>
      </div>
    </div>
  );
}
