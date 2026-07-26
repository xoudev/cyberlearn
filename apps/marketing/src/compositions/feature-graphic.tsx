import React from "react";
import { AbsoluteFill } from "remotion";
import { Brand, GridBackdrop, MonoLabel } from "../components/brand";
import { PhoneMock } from "../components/phone";
import { fonts, palette } from "../theme";
import { useFontsReady } from "../use-fonts-ready";

export function FeatureGraphic(): React.JSX.Element {
  useFontsReady();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bgBase, overflow: "hidden" }}>
      <GridBackdrop />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          right: 16,
          top: 38,
          background: `radial-gradient(circle, ${palette.blueSoft}, transparent 68%)`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, padding: "56px 64px" }}>
        <Brand compact />
        <div style={{ width: 520, marginTop: 64 }}>
          <MonoLabel>// La compétence par la pratique</MonoLabel>
          <h1
            style={{
              margin: "18px 0 14px",
              color: palette.textPrimary,
              fontFamily: fonts.sans,
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -2.4,
              lineHeight: 1.02,
            }}
          >
            Apprends. Pratique. <span style={{ color: palette.brandTurquoise }}>Progresse.</span>
          </h1>
          <p
            style={{
              margin: 0,
              color: palette.textSecondary,
              fontFamily: fonts.sans,
              fontSize: 20,
            }}
          >
            Développement · Réseau · Cybersécurité
          </p>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 34,
          top: 16,
          transform: "scale(0.52) rotate(4deg)",
          transformOrigin: "top right",
        }}
      >
        <PhoneMock screen="home" />
      </div>
      <div
        style={{
          position: "absolute",
          right: 218,
          top: 128,
          transform: "scale(0.38) rotate(-5deg)",
          transformOrigin: "top right",
          opacity: 0.8,
        }}
      >
        <PhoneMock screen="lesson" />
      </div>
    </AbsoluteFill>
  );
}
