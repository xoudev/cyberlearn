import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Path, Polygon, Polyline, Rect } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { LogoMark } from "@/components/logo";
import { Text } from "@/components/ui";

const TOUR_KEY = "cl.tour.done";

export async function isTourDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(TOUR_KEY)) === "1";
}

export async function resetTour(): Promise<void> {
  await AsyncStorage.removeItem(TOUR_KEY);
}

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function StepIcon({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Svg
      width={64}
      height={64}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.accent}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

const STEPS: Step[] = [
  {
    icon: <LogoMark size={72} />,
    title: "Bienvenue sur CyberLearn",
    body: "Apprends le dev, la cybersécurité et le réseau avec des missions concrètes, de l'XP et une vraie progression.",
  },
  {
    icon: (
      <StepIcon>
        <Path d="M4 19 V10 M10 19 V5 M16 19 v-7 M4 19 h16" />
        <Circle cx="19" cy="6" r="2.5" />
      </StepIcon>
    ),
    title: "Gagne de l'XP chaque jour",
    body: "Chaque leçon terminée rapporte de l'XP, fait monter ton niveau et entretient ta série 🔥. Les quêtes hebdo ajoutent des bonus.",
  },
  {
    icon: (
      <StepIcon>
        <Rect x="4" y="4" width="16" height="16" />
        <Path d="M8 9 h8 M8 12.5 h8 M8 16 h5" />
      </StepIcon>
    ),
    title: "Parcours et leçons",
    body: "Suis un parcours mission par mission, lis la leçon section par section, puis valide le quiz pour empocher l'XP.",
  },
  {
    icon: (
      <StepIcon>
        <Polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
        <Polyline points="8.5,12.5 11,15 16,9" />
      </StepIcon>
    ),
    title: "Ligue, badges et certificats",
    body: "Grimpe dans ta poule de ligue chaque saison, débloque des badges et décroche des certificats vérifiables.",
  },
  {
    icon: (
      <StepIcon>
        <Circle cx="12" cy="8" r="3.5" />
        <Path d="M5 20 c1.5-4 4-6 7-6 s5.5 2 7 6" />
      </StepIcon>
    ),
    title: "Tout part du Profil",
    body: "Bloc-notes, casier, classement, notifications et réglages t'attendent dans l'onglet Profil. Bonne chasse !",
  },
];

/** Full-screen first-launch guided tour. Renders nothing once completed. */
export function GuidedTour({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  async function finish(): Promise<void> {
    await AsyncStorage.setItem(TOUR_KEY, "1");
    onDone();
  }

  if (!step) return <View />;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        backgroundColor: "rgba(2,1,14,0.96)",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      {/* Skip */}
      <Pressable
        onPress={() => void finish()}
        style={{ position: "absolute", top: 60, right: 24, padding: 8 }}
      >
        <Text variant="micro" style={{ color: colors.textMuted }}>
          Passer
        </Text>
      </Pressable>

      <View key={index} style={{ alignItems: "center", gap: 18, maxWidth: 300 }}>
        <View
          style={{
            width: 110,
            height: 110,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.borderDefault,
            backgroundColor: colors.bgElevated,
          }}
        >
          {step.icon}
        </View>
        <Text variant="h1" style={{ textAlign: "center" }}>
          {step.title}
        </Text>
        <Text variant="body" style={{ textAlign: "center" }}>
          {step.body}
        </Text>
      </View>

      {/* Dots */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 30 }}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === index ? colors.accent : colors.borderDefault,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 26, alignSelf: "stretch" }}>
        {index > 0 ? (
          <PressableScale
            onPress={() => setIndex(index - 1)}
            style={{
              flex: 1,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.borderDefault,
            }}
          >
            <Text variant="micro">← Précédent</Text>
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={() => {
            if (isLast) void finish();
            else setIndex(index + 1);
          }}
          style={{
            flex: 2,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
          }}
        >
          <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
            {isLast ? "C'est parti !" : "Suivant →"}
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

/** Mounts the tour on first launch (post-login). */
export function TourGate(): React.JSX.Element | null {
  const [show, setShow] = useState(false);
  useEffect(() => {
    void isTourDone().then((done) => {
      if (!done) setShow(true);
    });
  }, []);
  if (!show) return null;
  return <GuidedTour onDone={() => setShow(false)} />;
}
