import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { LogoMark } from "@/components/logo";
import { Text } from "@/components/ui";

const TOUR_KEY = "cl.tour.done";

export async function isTourDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(TOUR_KEY)) === "1";
}

// ── Steps: a real walkthrough over the live UI ───────────────────────────────
// `anchor` points at a registered on-screen element (spotlight); no anchor =
// centered card. `route` navigates there before highlighting.

interface TourStep {
  anchor?: string;
  route?: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    title: "Bienvenue sur CyberLearn",
    body: "On te fait visiter ? 2 minutes, montre en main. Tu peux passer à tout moment.",
  },
  {
    anchor: "home-xp",
    route: "/accueil",
    title: "Ton niveau et ton XP",
    body: "Chaque leçon terminée remplit cette barre. Niveau après niveau, tu montes de palier.",
  },
  {
    anchor: "home-streak",
    route: "/accueil",
    title: "Ta série 🔥",
    body: "Un jour actif = la chaîne continue. Rate un jour et elle repart de zéro, alors reviens souvent !",
  },
  {
    anchor: "home-bell",
    route: "/accueil",
    title: "Tes notifications",
    body: "Badges débloqués, montées de niveau, certificats : tout arrive ici (et dans la barre de ton téléphone sur l'app installée).",
  },
  {
    anchor: "paths-search",
    route: "/parcours",
    title: "Les parcours",
    body: "Des séries de missions qui se déverrouillent dans l'ordre. Cherche, filtre par domaine ou difficulté, et lance-toi.",
  },
  {
    anchor: "lessons-filters",
    route: "/lecons",
    title: "Les leçons",
    body: "Chaque leçon se lit section par section et se termine par un quiz. Réussis-le pour empocher l'XP.",
  },
  {
    anchor: "profil-id",
    route: "/profil",
    title: "Ton QG : le Profil",
    body: "Ton avatar, ton palier, tes badges et certifs. Plus bas : Bloc-notes, Casier, Classement, Réglages… tout part d'ici.",
  },
  {
    title: "C'est parti !",
    body: "Ouvre un parcours, termine ta première mission et regarde l'XP tomber. Bonne chasse !",
  },
];

// ── Context: anchor registry + tour controls ─────────────────────────────────

interface TourContextValue {
  registerAnchor: (key: string, ref: React.RefObject<View | null>) => void;
  unregisterAnchor: (key: string) => void;
  start: () => void;
  running: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

/** Attach the returned ref to the View a tour step should spotlight. */
export function useTourAnchor(key: string): React.RefObject<View | null> {
  const ref = useRef<View | null>(null);
  const ctx = useContext(TourContext);
  useEffect(() => {
    ctx?.registerAnchor(key, ref);
    return () => ctx?.unregisterAnchor(key);
  }, [ctx, key]);
  return ref;
}

export function useTour(): { start: () => void; running: boolean } {
  const ctx = useContext(TourContext);
  return { start: ctx?.start ?? ((): void => undefined), running: ctx?.running ?? false };
}

// ── Spotlight overlay ─────────────────────────────────────────────────────────

interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

function PulseBorder({ hole }: { hole: Hole }): React.JSX.Element {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.55 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: hole.x - 3,
          top: hole.y - 3,
          width: hole.w + 6,
          height: hole.h + 6,
          borderWidth: 1.5,
          borderColor: colors.accent,
          borderRadius: 6,
        },
        style,
      ]}
    />
  );
}

function TourOverlayView({
  stepIndex,
  onNext,
  onPrev,
  onSkip,
  measure,
}: {
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  measure: (anchor: string) => Promise<Hole | null>;
}): React.JSX.Element | null {
  const { width, height } = useWindowDimensions();
  const [hole, setHole] = useState<Hole | null>(null);
  const [ready, setReady] = useState(false);
  const step = STEPS[stepIndex];

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setHole(null);
    if (!step) return;
    if (!step.anchor) {
      setReady(true);
      return;
    }
    // The target screen may still be mounting after navigation: retry briefly.
    const anchor = step.anchor;
    void (async () => {
      for (let attempt = 0; attempt < 14; attempt++) {
        const h = await measure(anchor);
        if (cancelled) return;
        if (h && h.w > 0 && h.h > 0 && h.y > -h.h && h.y < 4000) {
          setHole(h);
          setReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      if (!cancelled) setReady(true); // fallback: centered card, no spotlight
    })();
    return () => {
      cancelled = true;
    };
  }, [step, measure]);

  if (!step) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const pad = 6;
  const clampedHole = hole
    ? {
        x: Math.max(4, hole.x - pad),
        y: Math.max(4, hole.y - pad),
        w: Math.min(width - 8, hole.w + pad * 2),
        h: hole.h + pad * 2,
      }
    : null;

  // Bubble above or below the hole, wherever there is room.
  const bubbleBelow = clampedHole ? clampedHole.y + clampedHole.h + 190 < height : false;
  const bubbleTop = clampedHole
    ? bubbleBelow
      ? clampedHole.y + clampedHole.h + 14
      : undefined
    : undefined;
  const bubbleBottom = clampedHole && !bubbleBelow ? height - clampedHole.y + 14 : undefined;

  return (
    <View style={{ position: "absolute", inset: 0, zIndex: 80 }} pointerEvents="auto">
      {/* Dimmer with a cut-out over the target */}
      {ready && clampedHole ? (
        <>
          <Svg width={width} height={height} style={{ position: "absolute" }}>
            <Defs>
              <Mask id="tour-hole">
                <Rect x={0} y={0} width={width} height={height} fill="#fff" />
                <Rect
                  x={clampedHole.x}
                  y={clampedHole.y}
                  width={clampedHole.w}
                  height={clampedHole.h}
                  rx={6}
                  fill="#000"
                />
              </Mask>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="rgba(2,1,14,0.88)"
              mask="url(#tour-hole)"
            />
          </Svg>
          <PulseBorder hole={clampedHole} />
        </>
      ) : (
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(2,1,14,0.92)" }} />
      )}

      {/* Skip */}
      <Pressable
        onPress={onSkip}
        style={{ position: "absolute", top: 54, right: 22, padding: 8 }}
        hitSlop={8}
      >
        <Text variant="micro" style={{ color: colors.textMuted }}>
          Passer le tuto
        </Text>
      </Pressable>

      {/* Bubble */}
      {ready ? (
        <Animated.View
          key={stepIndex}
          entering={FadeIn.duration(200)}
          style={[
            {
              position: "absolute",
              left: 20,
              right: 20,
              backgroundColor: colors.bgElevated,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 18,
              gap: 10,
            },
            clampedHole
              ? { top: bubbleTop, bottom: bubbleBottom }
              : { top: "50%", transform: [{ translateY: -110 }] },
          ]}
        >
          {!clampedHole && stepIndex === 0 ? (
            <View style={{ alignItems: "center", marginBottom: 4 }}>
              <LogoMark size={54} />
            </View>
          ) : null}
          <Text variant="micro" style={{ color: colors.accent, letterSpacing: 2 }}>
            {stepIndex + 1} / {STEPS.length}
          </Text>
          <Text variant="h2">{step.title}</Text>
          <Text variant="body">{step.body}</Text>

          {/* Dots + nav */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === stepIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === stepIndex ? colors.accent : colors.borderDefault,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            {stepIndex > 0 ? (
              <PressableScale
                onPress={onPrev}
                style={{
                  flex: 1,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.borderDefault,
                }}
              >
                <Text variant="micro">←</Text>
              </PressableScale>
            ) : null}
            <PressableScale
              onPress={onNext}
              style={{
                flex: 3,
                height: 44,
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
      ) : null}
    </View>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const anchors = useRef(new Map<string, React.RefObject<View | null>>());
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const registerAnchor = useCallback((key: string, ref: React.RefObject<View | null>): void => {
    anchors.current.set(key, ref);
  }, []);
  const unregisterAnchor = useCallback((key: string): void => {
    anchors.current.delete(key);
  }, []);

  const measure = useCallback((anchor: string): Promise<Hole | null> => {
    return new Promise((resolve) => {
      const node = anchors.current.get(anchor)?.current;
      if (!node) {
        resolve(null);
        return;
      }
      node.measureInWindow((x, y, w, h) => {
        resolve({ x, y, w, h });
      });
    });
  }, []);

  const goTo = useCallback(
    (index: number): void => {
      const step = STEPS[index];
      if (!step) return;
      setStepIndex(index);
      if (step.route) {
        // SAFETY: typed routes are disabled; these are registered pathnames.
        router.navigate(step.route as never);
      }
    },
    [router],
  );

  const start = useCallback((): void => {
    setStepIndex(0);
    setRunning(true);
  }, []);

  const finish = useCallback((): void => {
    setRunning(false);
    void AsyncStorage.setItem(TOUR_KEY, "1");
  }, []);

  const value = useMemo(
    () => ({ registerAnchor, unregisterAnchor, start, running }),
    [registerAnchor, unregisterAnchor, start, running],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {running ? (
        <TourOverlayView
          stepIndex={stepIndex}
          measure={measure}
          onNext={() => {
            if (stepIndex >= STEPS.length - 1) finish();
            else goTo(stepIndex + 1);
          }}
          onPrev={() => goTo(Math.max(0, stepIndex - 1))}
          onSkip={finish}
        />
      ) : null}
    </TourContext.Provider>
  );
}

/** Auto-starts the walkthrough once, on the first authenticated launch. */
export function TourAutoStart(): null {
  const { start, running } = useTour();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || running) return;
    fired.current = true;
    void isTourDone().then((done) => {
      if (!done) {
        // Let the Accueil screen mount and register its anchors first.
        setTimeout(start, 900);
      }
    });
  }, [start, running]);
  return null;
}
