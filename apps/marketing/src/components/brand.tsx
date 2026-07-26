import React from "react";
import { Img, staticFile } from "remotion";
import { fonts, palette } from "../theme";

export function Brand({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const markSize = compact ? 52 : 72;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 14 : 18 }}>
      <Img src={staticFile("logo.png")} style={{ width: markSize, height: markSize }} />
      <div
        style={{
          color: palette.textPrimary,
          fontFamily: fonts.sans,
          fontSize: compact ? 28 : 42,
          fontWeight: 800,
          letterSpacing: compact ? 1.2 : 2,
        }}
      >
        CYBER<span style={{ color: palette.brandTurquoise }}>LEARN</span>
      </div>
    </div>
  );
}

export function MonoLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        color: palette.brandTurquoise,
        fontFamily: fonts.mono,
        fontSize: 18,
        fontWeight: 500,
        letterSpacing: 3.2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function GridBackdrop(): React.JSX.Element {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: palette.bgBase,
        backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.7) 62%, transparent 100%)",
      }}
    />
  );
}
