import React from "react";

type CalloutType = "info" | "warning" | "danger" | "tip" | "note";

const VARIANTS: Record<
  CalloutType,
  { border: string; bg: string; iconBg: string; iconColor: string; icon: string }
> = {
  info: {
    border: "var(--color-info)",
    bg: "rgba(77,139,255,0.06)",
    iconBg: "rgba(77,139,255,0.12)",
    iconColor: "var(--color-info)",
    icon: "ℹ",
  },
  tip: {
    border: "var(--cosmetic-accent)",
    bg: "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)",
    iconBg: "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)",
    iconColor: "var(--cosmetic-accent)",
    icon: "✦",
  },
  warning: {
    border: "var(--color-warning)",
    bg: "rgba(255,176,32,0.05)",
    iconBg: "rgba(255,176,32,0.10)",
    iconColor: "var(--color-warning)",
    icon: "⚠",
  },
  danger: {
    border: "var(--color-category-cybersec)",
    bg: "rgba(255,71,87,0.05)",
    iconBg: "rgba(255,71,87,0.10)",
    iconColor: "var(--color-category-cybersec)",
    icon: "✕",
  },
  note: {
    border: "var(--color-text-disabled)",
    bg: "rgba(63,61,92,0.15)",
    iconBg: "rgba(63,61,92,0.30)",
    iconColor: "var(--color-text-muted)",
    icon: "·",
  },
};

interface CalloutProps {
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
      style={{
        display: "flex",
        gap: "14px",
        margin: "1.5rem 0",
        padding: "14px 18px",
        background: v.bg,
        borderLeft: `3px solid ${v.border}`,
        border: `1px solid ${v.border}22`,
        borderLeftColor: v.border,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: v.iconBg,
          color: v.iconColor,
          fontSize: "14px",
          fontWeight: 700,
          marginTop: "1px",
        }}
      >
        {v.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: v.iconColor,
              marginBottom: "6px",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            lineHeight: "1.65",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
