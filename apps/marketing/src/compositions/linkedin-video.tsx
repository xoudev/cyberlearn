import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { GridBackdrop } from "../components/brand";
import { BrowserMock, type ShotName } from "../components/browser";
import { fonts, palette } from "../theme";
import { useFontsReady } from "../use-fonts-ready";

/**
 * The cut for a LinkedIn post looking for testers.
 *
 * Three things about that sentence decide the whole composition, and none of
 * them applied to the Play Store trailer this is derived from.
 *
 * Square, because LinkedIn's feed is a column: a 16:9 gets a third of the
 * height a 1:1 gets on a phone, and most of the feed is read on a phone.
 *
 * Silent, because the feed autoplays muted and most people never unmute. So
 * there is no voice-over to write and nothing is carried by the soundtrack -
 * every beat has to read with the sound off. The trailer's music is left out
 * on purpose rather than forgotten: a track nobody hears is bytes.
 *
 * And it asks for something. A trailer ends on "download"; this ends on the
 * two doors somebody can actually walk through - an account on the site, and
 * the Android test channel - because a post that recruits testers and does
 * not say where to go recruits nobody.
 *
 * The screens are photographs of the real thing, not drawings of it. The first
 * cut of this used hand-drawn approximations and that was the wrong call: a
 * video recruiting testers has to show what they will actually get, and a
 * drawing drifts from the product the moment somebody moves a button. See the
 * README for how the captures are produced.
 */

const ease = Easing.out(Easing.cubic);

function fade(frame: number, duration: number): number {
  const inn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const out = interpolate(frame, [duration - 13, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return Math.min(inn, out);
}

function Hook({ duration }: { duration: number }): React.JSX.Element {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 26], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <AbsoluteFill style={{ opacity: fade(frame, duration), display: "grid", placeItems: "center" }}>
      <GridBackdrop />
      <div style={{ position: "relative", textAlign: "center", padding: "0 90px" }}>
        <Img
          src={staticFile("logo.png")}
          style={{ width: 120, height: 120, margin: "0 auto 34px" }}
        />
        <div
          style={{
            transform: `translateY(${String(y)}px)`,
            color: palette.textPrimary,
            fontFamily: fonts.sans,
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
          }}
        >
          On cherche des
          <br />
          <span style={{ color: palette.brandTurquoise }}>testeurs.</span>
        </div>
        <div
          style={{
            marginTop: 30,
            color: palette.textSecondary,
            fontFamily: fonts.sans,
            fontSize: 30,
            lineHeight: 1.45,
          }}
        >
          CyberLearn — apprendre la cyber, le dev
          <br />
          et le réseau. Seul, ou avec sa classe.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Beat({
  duration,
  screen,
  count,
  title,
  body,
}: {
  duration: number;
  screen: ShotName;
  count: string;
  title: string;
  body: string;
}): React.JSX.Element {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, duration], [16, -16], { easing: Easing.linear });
  const rise = interpolate(frame, [0, 26], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ opacity: fade(frame, duration) }}>
      <GridBackdrop />
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          padding: "84px 76px 76px",
        }}
      >
        {/* Text first and text large: with the sound off this is the whole
            message, and the screen behind it is the evidence. */}
        <div style={{ transform: `translateY(${String(rise)}px)` }}>
          <div
            style={{
              color: palette.brandTurquoise,
              fontFamily: fonts.mono,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {`// ${count}`}
          </div>
          <div
            style={{
              color: palette.textPrimary,
              fontFamily: fonts.sans,
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.08,
              maxWidth: 880,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 18,
              color: palette.textSecondary,
              fontFamily: fonts.sans,
              fontSize: 27,
              lineHeight: 1.45,
              maxWidth: 840,
            }}
          >
            {body}
          </div>
        </div>

        <div style={{ position: "relative", overflow: "hidden", marginTop: 44 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: `translate(-50%, ${String(shift)}px) scale(0.6444)`,
              transformOrigin: "top center",
            }}
          >
            <BrowserMock screen={screen} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Ask({ duration }: { duration: number }): React.JSX.Element {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 28], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <AbsoluteFill
      style={{
        opacity: fade(frame, duration),
        display: "grid",
        placeItems: "center",
        backgroundColor: palette.bgBase,
      }}
    >
      <GridBackdrop />
      <div
        style={{
          position: "relative",
          textAlign: "center",
          padding: "0 80px",
          transform: `scale(${String(scale)})`,
        }}
      >
        <div
          style={{
            color: palette.textPrimary,
            fontFamily: fonts.sans,
            fontSize: 70,
            fontWeight: 800,
            letterSpacing: -2.4,
            lineHeight: 1.1,
          }}
        >
          Viens casser
          <br />
          <span style={{ color: palette.brandTurquoise }}>des trucs.</span>
        </div>
        <div
          style={{
            margin: "26px auto 40px",
            maxWidth: 760,
            color: palette.textSecondary,
            fontFamily: fonts.sans,
            fontSize: 27,
            lineHeight: 1.45,
          }}
        >
          On cherche des gens qui utilisent la plateforme pour de vrai et qui disent ce qui coince.
        </div>

        {/* Two doors, because there are two things to test and they are not
            the same commitment. */}
        <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
          <div
            style={{
              padding: "20px 34px",
              border: `2px solid ${palette.brandTurquoise}`,
              color: palette.brandTurquoise,
              fontFamily: fonts.mono,
              fontSize: 26,
              letterSpacing: 2,
            }}
          >
            cyberlearn.fr — compte gratuit
          </div>
          <div
            style={{
              padding: "15px 28px",
              border: `1px solid ${palette.borderDefault}`,
              color: palette.textSecondary,
              fontFamily: fonts.mono,
              fontSize: 19,
              letterSpacing: 1.4,
            }}
          >
            App Android : test ouvert, lien en commentaire
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function LinkedInVideo(): React.JSX.Element {
  useFontsReady();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bgBase }}>
      <Sequence from={0} durationInFrames={105}>
        <Hook duration={105} />
      </Sequence>
      <Sequence from={105} durationInFrames={135}>
        <Beat
          duration={135}
          screen="paths"
          count="01 · apprendre"
          title="Des parcours, pas une pile de vidéos."
          body="Cyber, réseau et développement. Tu sais toujours où tu en es et ce qui vient après."
        />
      </Sequence>
      <Sequence from={240} durationInFrames={135}>
        <Beat
          duration={135}
          screen="quiz"
          count="02 · pratiquer"
          title="Et on vérifie que ça a tenu."
          body="Chaque leçon se termine par des questions qui portent sur ce que tu viens de lire, pas sur des définitions."
        />
      </Sequence>
      <Sequence from={375} durationInFrames={135}>
        <Beat
          duration={135}
          screen="class"
          count="03 · en classe"
          title="Et côté prof, qui a fait quoi."
          body="Un enseignant donne du travail avec une date et suit l'avancement de sa classe, élève par élève."
        />
      </Sequence>
      <Sequence from={510} durationInFrames={135}>
        <Ask duration={135} />
      </Sequence>
    </AbsoluteFill>
  );
}
