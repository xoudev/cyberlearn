import React from "react";

type CalloutType = "info" | "warning" | "danger" | "tip" | "note";

const VARIANTS: Record<
  CalloutType,
  { border: string; bg: string; iconBg: string; iconColor: string; icon: string }
> = {
  info: {
    border: "#4D8BFF",
    bg: "rgba(77,139,255,0.06)",
    iconBg: "rgba(77,139,255,0.12)",
    iconColor: "#4D8BFF",
    icon: "ℹ",
  },
  tip: {
    border: "#0AFFD4",
    bg: "rgba(10,255,212,0.05)",
    iconBg: "rgba(10,255,212,0.10)",
    iconColor: "#0AFFD4",
    icon: "✦",
  },
  warning: {
    border: "#FFB020",
    bg: "rgba(255,176,32,0.05)",
    iconBg: "rgba(255,176,32,0.10)",
    iconColor: "#FFB020",
    icon: "⚠",
  },
  danger: {
    border: "#FF4757",
    bg: "rgba(255,71,87,0.05)",
    iconBg: "rgba(255,71,87,0.10)",
    iconColor: "#FF4757",
    icon: "✕",
  },
  note: {
    border: "#3F3D5C",
    bg: "rgba(63,61,92,0.15)",
    iconBg: "rgba(63,61,92,0.30)",
    iconColor: "#6B6890",
    icon: "·",
  },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children?: React.ReactNode;
}

export function Callout({ type = "info", title, children }: CalloutProps): React.JSX.Element {
  const v = VARIANTS[type];

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
            color: "#B8B5D1",
            lineHeight: "1.65",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
