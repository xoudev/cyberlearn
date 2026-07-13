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
  const overlayRef = useRef<View | null>(null);

  // Both the target and the overlay are measured in WINDOW coordinates, then
  // the overlay origin is subtracted: this cancels any constant offset (status
  // bar / edge-to-edge differences on Android) between the two spaces.
  const measureRelative = useCallback(
    async (anchor: string): Promise<Hole | null> => {
      const target = await measure(anchor);
      if (!target) return null;
      const origin = await new Promise<{ x: number; y: number } | null>((resolve) => {
        const node = overlayRef.current;
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y) => resolve({ x, y }));
      });
      if (!origin) return target;
      return { x: target.x - origin.x, y: target.y - origin.y, w: target.w, h: target.h };
    },
    [measure],
  );

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setHole(null);
    if (!step) return;
    if (!step.anchor) {
      setReady(true);
      return;
    }
    const anchor = step.anchor;
    let last: Hole | null = null;
    const tryMeasure = async (): Promise<boolean> => {
      const h = await measureRelative(anchor);
      if (cancelled) return true;
      if (h && h.w > 0 && h.h > 0 && h.y > -h.h && h.y < 4000) {
        // Only re-render when the target actually moved (layout settling).
        if (
          !last ||
          Math.abs(h.x - last.x) > 1 ||
          Math.abs(h.y - last.y) > 1 ||
          Math.abs(h.h - last.h) > 1
        ) {
          last = h;
          setHole(h);
        }
        setReady(true);
        return true;
      }
      return false;
    };
    // The target screen may still be mounting/loading after navigation: retry,
    // then keep tracking so the spotlight follows late layout shifts
    // (skeletons swapping to real content).
    void (async () => {
      let found = false;
      for (let attempt = 0; attempt < 25 && !cancelled && !found; attempt++) {
        found = await tryMeasure();
        if (!found) await new Promise((r) => setTimeout(r, 120));
      }
      if (!found && !cancelled) setReady(true); // fallback: centered card
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 400));
        if (!cancelled) await tryMeasure();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, measureRelative]);

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
    <View
      ref={overlayRef}
      collapsable={false}
      style={{ position: "absolute", inset: 0, zIndex: 80 }}
      pointerEvents="auto"
    >
      {/* Dimmer with a cut-out over the target - light enough that the page
          stays readable behind the spotlight. */}
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
              fill="rgba(2,1,14,0.55)"
              mask="url(#tour-hole)"
            />
          </Svg>
          <PulseBorder hole={clampedHole} />
        </>
      ) : (
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(2,1,14,0.85)" }} />
      )}

      {/* Skip */}
      <Pressable
        onPress={onSkip}
        style={({ pressed }) => ({
          position: "absolute",
          top: 54,
          right: 22,
          minHeight: 34,
          paddingHorizontal: 12,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: pressed ? colors.accent : colors.borderDefault,
          backgroundColor: "rgba(5,4,26,0.7)",
          borderRadius: 999,
        })}
        hitSlop={8}
        accessibilityRole="button"
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
              borderRadius: 14,
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
                  borderRadius: 10,
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
                borderRadius: 10,
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
