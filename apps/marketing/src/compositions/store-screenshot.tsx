import React from "react";
import { AbsoluteFill } from "remotion";
import { Brand, GridBackdrop, MonoLabel } from "../components/brand";
import { PhoneMock } from "../components/phone";
import type { ScreenName } from "../components/screens";
import { fonts, palette } from "../theme";
import { useFontsReady } from "../use-fonts-ready";

export type StoreScreenshotProps = {
  screen: ScreenName;
  index: string;
  title: string;
  body: string;
};

export function StoreScreenshot({
  screen,
  index,
  title,
  body,
}: StoreScreenshotProps): React.JSX.Element {
  useFontsReady();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bgBase, overflow: "hidden" }}>
      <GridBackdrop />
      <div style={{ position: "absolute", inset: 0, padding: "78px 72px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand compact />
          <MonoLabel>// {index} · Android</MonoLabel>
        </div>

        <div style={{ marginTop: 88, maxWidth: 900 }}>
          <MonoLabel>Apprendre · pratiquer · progresser</MonoLabel>
          <h1
            style={{
              margin: "24px 0 18px",
              color: palette.textPrimary,
              fontFamily: fonts.sans,
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: -3.2,
              lineHeight: 1.03,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 760,
              color: palette.textSecondary,
              fontFamily: fonts.sans,
              fontSize: 31,
              lineHeight: 1.35,
            }}
          >
            {body}
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            top: 645,
            left: "50%",
            transform: "translateX(-50%) scale(1.22)",
            transformOrigin: "top center",
          }}
        >
          <PhoneMock screen={screen} />
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 45,
            left: 72,
            right: 72,
            display: "flex",
            justifyContent: "space-between",
            color: palette.textMuted,
            fontFamily: fonts.mono,
            fontSize: 15,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          <span>cyberlearn.fr</span>
          <span>version 2.3</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
