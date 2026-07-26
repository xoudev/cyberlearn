import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { GridBackdrop, MonoLabel } from "../components/brand";
import { PhoneMock } from "../components/phone";
import { fonts, palette } from "../theme";
import { useFontsReady } from "../use-fonts-ready";

function Wordmark(): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <Img src={staticFile("logo.png")} style={{ width: 96, height: 96 }} />
      <div
        style={{
          color: palette.textPrimary,
          fontFamily: fonts.sans,
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: 2,
        }}
      >
        CYBER<span style={{ color: palette.brandTurquoise }}>LEARN</span>
      </div>
    </div>
  );
}

export function YouTubeBanner(): React.JSX.Element {
  useFontsReady();

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bgBase, overflow: "hidden" }}>
      <GridBackdrop />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at center, ${palette.blueSoft}, transparent 48%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 507,
          top: 508,
          width: 1546,
          height: 423,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 86px",
        }}
      >
        <div>
          <Wordmark />
          <div style={{ marginTop: 28 }}>
            <MonoLabel>// Apprends. Pratique. Progresse.</MonoLabel>
          </div>
        </div>
        <div
          style={{
            color: palette.textSecondary,
            fontFamily: fonts.mono,
            fontSize: 24,
            letterSpacing: 2,
            lineHeight: 1.7,
            textAlign: "right",
          }}
        >
          DÉVELOPPEMENT
          <br />
          RÉSEAU
          <br />
          CYBERSÉCURITÉ
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: -170,
          top: 275,
          transform: "scale(0.72) rotate(-6deg)",
          opacity: 0.68,
        }}
      >
        <PhoneMock screen="lesson" />
      </div>
      <div
        style={{
          position: "absolute",
          right: -170,
          top: 260,
          transform: "scale(0.72) rotate(6deg)",
          opacity: 0.68,
        }}
      >
        <PhoneMock screen="home" />
      </div>
    </AbsoluteFill>
  );
}

export function YouTubeThumbnail(): React.JSX.Element {
  useFontsReady();

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bgBase, overflow: "hidden" }}>
      <GridBackdrop />
      <div
        style={{
          position: "absolute",
          right: -30,
          top: 40,
          width: 650,
          height: 650,
          background: `radial-gradient(circle, ${palette.blueSoft}, transparent 68%)`,
        }}
      />
      <div style={{ position: "absolute", left: 78, top: 74 }}>
        <Wordmark />
        <h1
          style={{
            width: 700,
            margin: "88px 0 26px",
            color: palette.textPrimary,
            fontFamily: fonts.sans,
            fontSize: 78,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.02,
          }}
        >
          Apprends. Pratique. <span style={{ color: palette.brandTurquoise }}>Progresse.</span>
        </h1>
        <MonoLabel>// L'application CyberLearn</MonoLabel>
      </div>
      <div
        style={{
          position: "absolute",
          right: 54,
          top: 20,
          transform: "scale(0.72) rotate(4deg)",
          transformOrigin: "top right",
        }}
      >
        <PhoneMock screen="home" />
      </div>
    </AbsoluteFill>
  );
}
