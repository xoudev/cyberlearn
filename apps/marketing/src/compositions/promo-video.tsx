import React from "react";
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Brand, GridBackdrop, MonoLabel } from "../components/brand";
import { PhoneMock } from "../components/phone";
import type { ScreenName } from "../components/screens";
import { fonts, palette } from "../theme";
import { useFontsReady } from "../use-fonts-ready";

const ease = Easing.out(Easing.cubic);

function sceneOpacity(frame: number, duration: number): number {
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const fadeOut = interpolate(frame, [duration - 16, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return Math.min(fadeIn, fadeOut);
}

function Intro(): React.JSX.Element {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, 90);
  const markScale = interpolate(frame, [0, 28], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const copyY = interpolate(frame, [12, 40], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <AbsoluteFill style={{ opacity, display: "grid", placeItems: "center" }}>
      <GridBackdrop />
      <div style={{ position: "relative", textAlign: "center", transform: `scale(${markScale})` }}>
        <Img
          src={staticFile("logo.png")}
          style={{ width: 170, height: 170, margin: "0 auto 24px" }}
        />
        <div
          style={{
            color: palette.textPrimary,
            fontFamily: fonts.sans,
            fontSize: 66,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          CYBER<span style={{ color: palette.brandTurquoise }}>LEARN</span>
        </div>
        <div style={{ marginTop: 24, transform: `translateY(${copyY}px)` }}>
          <MonoLabel>// La compétence se travaille</MonoLabel>
        </div>
      </div>
    </AbsoluteFill>
  );
}

type ProductSceneProps = {
  duration: number;
  screen: ScreenName;
  eyebrow: string;
  title: string;
  body: string;
  count: string;
  reverse?: boolean;
};

function ProductScene({
  duration,
  screen,
  eyebrow,
  title,
  body,
  count,
  reverse = false,
}: ProductSceneProps): React.JSX.Element {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, duration);
  const copyX = interpolate(frame, [0, 26], [reverse ? 70 : -70, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const phoneX = interpolate(frame, [4, 34], [reverse ? -90 : 90, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const phoneScale = interpolate(frame, [4, 34], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  const copy = (
    <div style={{ width: 810, transform: `translateX(${copyX}px)` }}>
      <MonoLabel>
        // {count} · {eyebrow}
      </MonoLabel>
      <h2
        style={{
          margin: "30px 0 24px",
          color: palette.textPrimary,
          fontFamily: fonts.sans,
          fontSize: 82,
          fontWeight: 800,
          letterSpacing: -3.5,
          lineHeight: 1.02,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          width: 690,
          color: palette.textSecondary,
          fontFamily: fonts.sans,
          fontSize: 30,
          lineHeight: 1.42,
        }}
      >
        {body}
      </p>
    </div>
  );

  const phone = (
    <div
      style={{
        width: 430,
        height: 932,
        transform: `translateX(${phoneX}px) scale(${phoneScale * 0.88})`,
        transformOrigin: "center",
      }}
    >
      <PhoneMock screen={screen} />
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: palette.bgBase, overflow: "hidden" }}>
      <GridBackdrop />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "74px 92px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Brand compact />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 80,
          }}
        >
          {reverse ? phone : copy}
          {reverse ? copy : phone}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: palette.textMuted,
            fontFamily: fonts.mono,
            fontSize: 15,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          <span>Application Android</span>
          <span>cyberlearn.fr</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FinalCard(): React.JSX.Element {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, 90);
  const scale = interpolate(frame, [0, 30], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <AbsoluteFill
      style={{ opacity, display: "grid", placeItems: "center", backgroundColor: palette.bgBase }}
    >
      <GridBackdrop />
      <div style={{ position: "relative", textAlign: "center", transform: `scale(${scale})` }}>
        <Brand />
        <h2
          style={{
            margin: "46px auto 20px",
            maxWidth: 1120,
            color: palette.textPrimary,
            fontFamily: fonts.sans,
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.04,
          }}
        >
          Apprends la cyber.
          <br />
          <span style={{ color: palette.brandTurquoise }}>Pas juste la théorie.</span>
        </h2>
        <div
          style={{
            display: "inline-flex",
            marginTop: 26,
            padding: "17px 24px",
            border: `1px solid ${palette.brandTurquoise}`,
            color: palette.brandTurquoise,
            fontFamily: fonts.mono,
            fontSize: 18,
            letterSpacing: 2.4,
            textTransform: "uppercase",
          }}
        >
          cyberlearn.fr/telecharger
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function PromoVideo(): React.JSX.Element {
  useFontsReady();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bgBase }}>
      <Html5Audio
        name="Original CyberLearn soundtrack"
        src={staticFile("audio/cyberlearn-promo.wav")}
        volume={(frame) =>
          interpolate(frame, [0, 24, 690, 719], [0, 0.56, 0.56, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Sequence from={0} durationInFrames={90}>
        <Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={135}>
        <ProductScene
          duration={135}
          screen="home"
          count="01"
          eyebrow="Progression"
          title="Progresse à chaque session."
          body="XP, séries et reprise instantanée : tu sais toujours où continuer."
        />
      </Sequence>
      <Sequence from={225} durationInFrames={135}>
        <ProductScene
          duration={135}
          screen="paths"
          count="02"
          eyebrow="Parcours"
          title="Choisis un cap. Va jusqu’au bout."
          body="Des parcours structurés en développement, réseau et cybersécurité."
          reverse
        />
      </Sequence>
      <Sequence from={360} durationInFrames={135}>
        <ProductScene
          duration={135}
          screen="lesson"
          count="03"
          eyebrow="Pratique"
          title="Passe de la théorie au geste."
          body="Lis, expérimente dans le terminal et valide ce que tu viens d’apprendre."
        />
      </Sequence>
      <Sequence from={495} durationInFrames={135}>
        <ProductScene
          duration={135}
          screen="locker"
          count="04"
          eyebrow="Identité"
          title="Fais évoluer ton profil."
          body="Badges, certificats et cosmétiques récompensent le travail accompli."
          reverse
        />
      </Sequence>
      <Sequence from={630} durationInFrames={90}>
        <FinalCard />
      </Sequence>
    </AbsoluteFill>
  );
}
