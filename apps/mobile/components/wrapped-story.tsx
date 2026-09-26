import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Sharing from "expo-sharing";
import {
  type GestureResponderEvent,
  PixelRatio,
  Pressable,
  Text as RNText,
  Share,
  type TextStyle,
  View,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Text } from "@/components/ui";
import { useReducedMotionPreference } from "@/lib/accessibility";
import { useCosmetics } from "@/lib/cosmetics";
import {
  HOLD_MS,
  SLIDE_MS,
  WRAPPED_CARD_SIZE,
  accentColor,
  buildStorySlides,
  fmtNumber,
  stepIndex,
  lineTop,
  tapDirection,
  wrappedCardContent,
  wrappedCardFrame,
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
 * The last slide: the year on one card, and the share sheet. "Partager l'image"
 * sends the site's story image (1080 x 1920, the same figures and words,
 * @cyberlearn/lib/gamification/wrapped-card), captured from a copy of the card
 * laid out off screen; the share sheet is also where it is saved to the phone.
 * "Partager en texte" stays for a target that takes no image.
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
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<View>(null);
  const rows: [string, string][] = [
    ["XP", fmtNumber(payload.xp.thisYear)],
    ["Leçons", fmtNumber(payload.lessons.total)],
    ["Série", `${fmtNumber(payload.streak.longest)} j`],
    ["Badges", fmtNumber(payload.badges.thisYear)],
  ];

  const shareText = (): void => {
    setError(null);
    Share.share({ message: wrappedShareText(payload, handle) }).catch(() =>
      setError("Le partage n'a pas pu s'ouvrir."),
    );
  };

  const shareImage = async (): Promise<void> => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        shareText();
        return;
      }
      const uri = await captureRef(imageRef, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "Mon CyberLearn Wrapped",
      });
    } catch {
      setError("L'image n'a pas pu être partagée.");
    } finally {
      setBusy(false);
    }
  };

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
        label={busy ? "Préparation de l'image…" : "Partager l'image"}
        disabled={busy}
        onPress={() => void shareImage()}
      />
      <View style={{ alignSelf: "flex-start" }}>
        <ActionChip label="Partager en texte" tone="neutral" disabled={busy} onPress={shareText} />
      </View>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        Story 1080×1920, prête à poster.
      </Text>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <StoryImage viewRef={imageRef} payload={payload} handle={handle} />
    </View>
  );
}

/**
 * The site's story image, as views: its canvas (WrappedClient's drawStoryCard)
 * line for line, same positions, sizes and colours, in the reader's accent.
 * Laid out off screen and hidden from assistive technology: it exists to be
 * captured, and the card above says the same thing on screen.
 */
function StoryImage({
  viewRef,
  payload,
  handle,
}: {
  viewRef: React.RefObject<View | null>;
  payload: WrappedPayload;
  handle: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const card = wrappedCardContent(payload, handle);
  const { width, height, px } = wrappedCardFrame(PixelRatio.get());
  const W: number = WRAPPED_CARD_SIZE.width;

  // A line of the canvas: centred on `x` in a box `boxWidth` wide.
  const line = (
    baseline: number,
    size: number,
    family: string,
    color: string,
    x = W / 2,
    boxWidth = W,
  ): TextStyle => ({
    position: "absolute",
    top: px(lineTop(baseline, size)),
    left: px(x - boxWidth / 2),
    width: px(boxWidth),
    textAlign: "center",
    fontFamily: family,
    fontSize: px(size),
    lineHeight: px(size * 1.2),
    color,
    includeFontPadding: false,
  });
  const mono = `${fonts.mono}_400Regular`;
  const monoBold = `${fonts.mono}_700Bold`;
  const sansHeavy = `${fonts.sans}_800ExtraBold`;
  const sans = `${fonts.sans}_400Regular`;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: -10000 }}
    >
      <View
        ref={viewRef}
        collapsable={false}
        style={{ width, height, backgroundColor: "#030219", overflow: "hidden" }}
      >
        <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
          <Defs>
            <RadialGradient
              id="wrapped-glow"
              cx={px(W / 2)}
              cy={px(420)}
              r={px(900)}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#0AFFD4" stopOpacity={0.1} />
              <Stop offset="1" stopColor="#030219" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#wrapped-glow)" />
          <Rect x={px(140)} y={px(1439)} width={px(W - 280)} height={px(2)} fill="#1F1B47" />
        </Svg>

        <RNText style={line(190, 34, monoBold, theme.accent)}>{card.title}</RNText>
        <RNText style={line(400, 210, sansHeavy, "#F5F5FA")}>{card.year}</RNText>
        <RNText style={line(470, 28, mono, "#7F7BA9")}>{card.handle}</RNText>
        {card.stats.map(({ value, label }, i) => {
          const x = i % 2 === 0 ? W / 4 : (W / 4) * 3;
          const y = 760 + Math.floor(i / 2) * 320;
          return (
            <React.Fragment key={label}>
              <RNText style={line(y, 120, sansHeavy, theme.accent, x, W / 2)}>{value}</RNText>
              <RNText style={line(y + 60, 30, mono, "#7F7BA9", x, W / 2)}>{label}</RNText>
            </React.Fragment>
          );
        })}
        {card.domain !== null ? (
          <RNText style={line(1300, 36, sans, "#B8B5D1")}>{card.domain}</RNText>
        ) : null}
        <RNText style={line(1520, 28, mono, "#44406B")}>{card.site}</RNText>
      </View>
    </View>
  );
}
