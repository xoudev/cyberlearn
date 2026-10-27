import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BASTION_MARK_PATHS } from "../../../web/components/bastion-logo";
import { useFontsReady } from "../use-fonts-ready";

const colors = {
  carbon: "#0B0C0E",
  paper: "#EAE7DF",
  ink: "#141518",
  copper: "#FF6B2B",
  muted: "#AAA79F",
};
const display = "Barlow Condensed, Arial, sans-serif";
const text = "Space Grotesk, Arial, sans-serif";

function Mark({ size = 64 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256">
      <path d={BASTION_MARK_PATHS.top} fill={colors.copper} />
      <path d={BASTION_MARK_PATHS.left} fill={colors.ink} />
      <path d={BASTION_MARK_PATHS.right} fill={colors.ink} />
      <path d={BASTION_MARK_PATHS.core} fill={colors.copper} />
    </svg>
  );
}

function Brand(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        color: colors.ink,
        background: colors.paper,
        padding: "16px 26px",
        width: "fit-content",
      }}
    >
      <Mark size={58} />
      <span style={{ font: `600 46px ${display}` }}>
        CYBERLEARN<span style={{ color: "#923200" }}>.</span>
      </span>
    </div>
  );
}

function Cover({ title, description }: { title: string; description: string }): React.ReactElement {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: 96, justifyContent: "center", gap: 36, opacity }}>
      <Brand />
      <h1
        style={{ margin: 0, font: `600 130px/1 ${display}`, color: colors.paper, maxWidth: 1500 }}
      >
        {title}
      </h1>
      <p style={{ margin: 0, font: `36px/1.5 ${text}`, color: "#C2BFB8", maxWidth: 1450 }}>
        {description}
      </p>
    </AbsoluteFill>
  );
}

function Screen({
  image,
  index,
  title,
  description,
}: {
  image: string;
  index: string;
  title: string;
  description: string;
}): React.ReactElement {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        padding: "64px 72px 112px",
        gap: 52,
        alignItems: "center",
        opacity,
      }}
    >
      <div style={{ width: 400, flexShrink: 0 }}>
        <div style={{ color: colors.copper, font: `600 64px ${display}`, marginBottom: 24 }}>
          {index}
        </div>
        <h2 style={{ margin: "0 0 28px", font: `600 82px/1.02 ${display}`, color: colors.paper }}>
          {title}
        </h2>
        <p style={{ margin: 0, font: `28px/1.6 ${text}`, color: "#C2BFB8" }}>{description}</p>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          border: "1px solid #74767D",
          borderTop: "5px solid #FF6B2B",
        }}
      >
        <Img
          src={staticFile(`web-demo/${image}.png`)}
          style={{ display: "block", width: "100%" }}
        />
      </div>
    </AbsoluteFill>
  );
}

function Film({ welcome }: { welcome: boolean }): React.ReactElement {
  useFontsReady();
  return (
    <AbsoluteFill style={{ background: colors.carbon, fontFamily: text }}>
      <Html5Audio src={staticFile(`web-demo/${welcome ? "welcome" : "launch"}-audio.m4a`)} />
      {welcome ? (
        <>
          <Sequence from={0} durationInFrames={90}>
            <Cover
              title="Bienvenue dans ton espace."
              description="Un cap, une prochaine leçon, ta progression."
            />
          </Sequence>
          <Sequence from={90} durationInFrames={210}>
            <Screen
              image="dashboard"
              index="01 / Reprendre"
              title="Reprends le fil."
              description="Ta prochaine leçon reste au premier plan sur le tableau de bord."
            />
          </Sequence>
          <Sequence from={300} durationInFrames={210}>
            <Screen
              image="paths"
              index="02 / Choisir"
              title="Trouve ton parcours."
              description="Compare les domaines et les niveaux. Le guide t’aide à choisir."
            />
          </Sequence>
          <Sequence from={510} durationInFrames={120}>
            <Cover
              title="À toi de jouer."
              description="Ouvre ta prochaine leçon, ou choisis un parcours pour commencer."
            />
          </Sequence>
        </>
      ) : (
        <>
          <Sequence from={0} durationInFrames={90}>
            <Cover
              title="Apprends en pratiquant."
              description="Cybersécurité, développement et réseaux sur CyberLearn."
            />
          </Sequence>
          <Sequence from={90} durationInFrames={210}>
            <Screen
              image="paths"
              index="01 / Choisir"
              title="Un cap pour apprendre."
              description="Des parcours à comparer par domaine, niveau et durée."
            />
          </Sequence>
          <Sequence from={300} durationInFrames={240}>
            <Screen
              image="lesson"
              index="02 / Pratiquer"
              title="Comprendre, puis tester."
              description="La leçon, ses étapes et tes notes restent à portée de main."
            />
          </Sequence>
          <Sequence from={540} durationInFrames={240}>
            <Screen
              image="dashboard"
              index="03 / Progresser"
              title="Garde le fil."
              description="Retrouve la suite de ton apprentissage et tes objectifs de la semaine."
            />
          </Sequence>
          <Sequence from={780} durationInFrames={120}>
            <Cover title="Ton prochain pas commence ici." description="cyberlearn.fr" />
          </Sequence>
        </>
      )}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 30,
          display: "flex",
          justifyContent: "space-between",
          color: colors.muted,
          font: `20px ${text}`,
        }}
      >
        <span>Interface de démonstration · données locales de test</span>
        <span>CyberLearn · Bastion</span>
      </div>
    </AbsoluteFill>
  );
}

export function WebLaunchVideo(): React.ReactElement {
  return <Film welcome={false} />;
}
export function WebWelcomeVideo(): React.ReactElement {
  return <Film welcome />;
}
