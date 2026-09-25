import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type GestureResponderEvent, Pressable, Share, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { GradientButton } from "@/components/buttons";
import { Text } from "@/components/ui";
import { useReducedMotionPreference } from "@/lib/accessibility";
import { useCosmetics } from "@/lib/cosmetics";
import {
  HOLD_MS,
  SLIDE_MS,
  accentColor,
  buildStorySlides,
  fmtNumber,
  stepIndex,
  tapDirection,
  wrappedShareText,
  type Slide,
  type WrappedPayload,
} from "@/lib/wrapped";

/**
 * The year as a story, as on the site: one figure per screen, a bar per slide
 * across the top, tap the right half to go on and the left half to go back,
 * hold to stop it moving. With reduced motion asked for, it only moves when
 * tapped.
 */
export function WrappedStory({
  payload,
  handle,
  onClose,
}: {
  payload: WrappedPayload;
  handle: string;
  onClose: () => void;
}): React.JSX.Element {
  const slides = useMemo(() => buildStorySlides(payload), [payload]);
  const reduced = useReducedMotionPreference();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState(1);
  const elapsed = useRef(0);
  const pressedAt = useRef<number | null>(null);
  const last = slides.length - 1;

  const go = useCallback(
    (direction: "previous" | "next") => {
      elapsed.current = 0;
      setProgress(0);
      setIndex((current) => stepIndex(current, slides.length, direction));
    },
    [slides.length],
  );

  // One animation-frame loop measuring elapsed time against the slide's
  // duration, like the site's clock: it also draws the bar, and it stops dead
  // when paused or on the last slide, which holds.
  useEffect(() => {
    if (reduced || paused) return;
    if (index >= last) {
      setProgress(1);
      return;
    }
    let frame = 0;
    let previous: number | null = null;
    const tick = (stamp: number): void => {
      if (previous !== null) elapsed.current += stamp - previous;
      previous = stamp;
      const ratio = elapsed.current / SLIDE_MS;
      if (ratio >= 1) {
        go("next");
        return;
      }
      setProgress(ratio);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, last, paused, reduced, go]);

  const onPressIn = (): void => {
    pressedAt.current = Date.now();
    setPaused(true);
  };
  const onPressOut = (event: GestureResponderEvent): void => {
    const started = pressedAt.current;
    pressedAt.current = null;
    setPaused(false);
    // A hold was somebody reading, not navigating: releasing it resumes.
    if (started === null || Date.now() - started >= HOLD_MS) return;
    go(tapDirection(event.nativeEvent.locationX, width));
  };

  const slide = slides[index];
  if (!slide) return <View />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <Bars count={slides.length} index={index} progress={progress} />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text variant="micro">
          <Text variant="micro" style={{ color: colors.textPrimary }}>
            cyber
          </Text>{" "}
          learn
        </Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable
            onPress={() => setPaused((p) => !p)}
            accessibilityRole="button"
            accessibilityLabel={paused ? "Reprendre" : "Mettre en pause"}
            hitSlop={10}
          >
            <Text variant="micro" style={{ color: colors.textSecondary }}>
              {paused ? "▶" : "❚❚"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            hitSlop={10}
          >
            <Text variant="micro" style={{ color: colors.textSecondary }}>
              ✕
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={{ flex: 1 }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="adjustable"
        accessibilityLabel={`Écran ${String(index + 1)} sur ${String(slides.length)}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) =>
          go(e.nativeEvent.actionName === "increment" ? "next" : "previous")
        }
      >
        <SlideView slide={slide} payload={payload} handle={handle} />
      </Pressable>
    </View>
  );
}

function Bars({
  count,
  index,
  progress,
}: {
  count: number;
  index: number;
  progress: number;
}): React.JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingTop: 10 }}
    >
      {Array.from({ length: count }, (_, i) => {
        const fill = i < index ? 1 : i === index ? progress : 0;
        return (
          <View key={i} style={{ flex: 1, height: 3, backgroundColor: colors.borderDefault }}>
            <View
              style={{ height: 3, width: `${fill * 100}%`, backgroundColor: colors.textPrimary }}
            />
          </View>
        );
      })}
    </View>
  );
}

function SlideView({
  slide,
  payload,
  handle,
}: {
  slide: Slide;
  payload: WrappedPayload;
  handle: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const accent = accentColor(slide.accent, theme.accent);
  const headline =
    slide.headline !== undefined ? (
      <Text
        style={{
          fontFamily: `${fonts.sans}_800ExtraBold`,
          fontSize: 30,
          lineHeight: 36,
          color: accent,
        }}
      >
        {slide.headline}
      </Text>
    ) : null;

  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14 }}>
      <Text variant="micro" style={{ color: accent }}>
        {slide.eyebrow}
      </Text>
      {slide.kicker !== undefined ? (
        <Text variant="body" style={{ color: colors.textSecondary }}>
          {slide.kicker}
        </Text>
      ) : null}
      {slide.headlineFirst === true ? headline : null}
      {slide.figure !== undefined ? (
        <Text
          style={{
            fontFamily: `${fonts.sans}_800ExtraBold`,
            fontSize: 64,
            lineHeight: 70,
            color: colors.textPrimary,
          }}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {slide.figure.value}
          {slide.figure.unit !== undefined ? (
            <Text style={{ fontSize: 26, color: accent }}>{` ${slide.figure.unit}`}</Text>
          ) : null}
        </Text>
      ) : null}
      {slide.headlineFirst === true ? null : headline}
      {slide.lead !== undefined ? (
        <Text variant="body" style={{ color: colors.textSecondary }}>
          {slide.lead}
        </Text>
      ) : null}

      {slide.extra?.kind === "bars" ? (
        <View style={{ gap: 10, marginTop: 6 }}>
          {slide.extra.rows.map((row) => (
            <View key={row.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text variant="micro" style={{ width: 70 }}>
                {row.label}
              </Text>
              <View style={{ flex: 1, height: 6, backgroundColor: colors.borderDefault }}>
                <View style={{ height: 6, width: `${row.share}%`, backgroundColor: accent }} />
              </View>
              <Text variant="mono" style={{ width: 34, textAlign: "right", fontSize: 12 }}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {slide.extra?.kind === "list" ? (
        <View style={{ gap: 8, marginTop: 6 }}>
          {slide.extra.rows.map((row) => (
            <View key={row.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 6, height: 6, backgroundColor: accent }} />
              <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                {row.label}
              </Text>
              <Text variant="micro">{row.note}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {slide.extra?.kind === "share" ? (
        <ShareCard payload={payload} handle={handle} accent={accent} />
      ) : null}

      {slide.footer !== undefined ? (
        <Text variant="micro" style={{ marginTop: 8 }}>
          {slide.footer}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The last slide: the year on one card, and the share sheet. The site draws
 * the card into an image; the app sends the year in words, which every share
 * target on a phone takes.
 */
function ShareCard({
  payload,
  handle,
  accent,
}: {
  payload: WrappedPayload;
  handle: string;
  accent: string;
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const rows: [string, string][] = [
    ["XP", fmtNumber(payload.xp.thisYear)],
    ["Leçons", fmtNumber(payload.lessons.total)],
    ["Série", `${fmtNumber(payload.streak.longest)} j`],
    ["Badges", fmtNumber(payload.badges.thisYear)],
  ];
  return (
    <View style={{ gap: 14, marginTop: 6 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: accent,
          backgroundColor: `${accent}10`,
          padding: 18,
          gap: 12,
        }}
      >
        <Text variant="micro" style={{ color: accent }}>
          {`CyberLearn Wrapped · ${payload.periodKey}`}
        </Text>
        <Text variant="h2">{`@${handle}`}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {rows.map(([label, value]) => (
            <View key={label} style={{ width: "45%", gap: 2 }}>
              <Text variant="micro">{label}</Text>
              <Text
                style={{
                  fontFamily: `${fonts.sans}_800ExtraBold`,
                  fontSize: 24,
                  color: colors.textPrimary,
                }}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <GradientButton
        label="Partager mon année"
        onPress={() => {
          setError(null);
          Share.share({ message: wrappedShareText(payload, handle) }).catch(() =>
            setError("Le partage n'a pas pu s'ouvrir."),
          );
        }}
      />
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
