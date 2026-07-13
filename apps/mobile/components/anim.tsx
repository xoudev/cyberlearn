import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Pressable, type PressableProps, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Polygon } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";

// NOTE: content screens render statically (no entrance/press motion). Animation
// is reserved for genuine *reward* moments - XP fill, count-up, level-up, badge
// reveals - so it reads as feedback, not decoration.

// ── Layout passthroughs (kept so callers stay unchanged) ─────────────────────

/** Plain wrapper - no entrance animation. */
export function Rise({
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  return style ? <View style={style}>{children}</View> : <>{children}</>;
}

/**
 * Pressable with a subtle opacity dip on press (no scale wrapper). Applies the
 * given style directly to the Pressable, so flex layouts (e.g. timeline rows)
 * are preserved.
 */
export function PressableScale({
  children,
  style,
  disabled,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: ViewStyle }): React.JSX.Element {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.6 } : null]}
    >
      {children}
    </Pressable>
  );
}

/** Spring pop-in for reward reveals (badges, result checkmark). */
export function PopIn({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 160 }));
  }, [scale, delay]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(150).delay(delay)} style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ── Loops ─────────────────────────────────────────────────────────────────────

/** Soft infinite pulse (streak flame, live dots). */
export function Pulse({
  children,
  style,
  amplitude = 1.06,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  amplitude?: number;
}): React.JSX.Element {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(amplitude, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [scale, amplitude]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/** Animated count-up number (XP gains, ranks). */
export function CountUp({
  to,
  duration = 900,
  prefix = "",
  suffix = "",
  fontSize = 30,
  color = colors.accent,
  delay = 0,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
  delay?: number;
}): React.JSX.Element {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(to, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, to, duration, delay]);
  useAnimatedReaction(
    () => Math.round(progress.value),
    (v, prev) => {
      if (v !== prev) runOnJS(setDisplay)(v);
    },
  );
  return (
    <Text
      style={{
        fontFamily: `${fonts.sans}_800ExtraBold`,
        fontSize,
        // Explicit line height: RN clips large glyph ascenders otherwise.
        lineHeight: Math.round(fontSize * 1.25),
        color,
      }}
    >
      {prefix}
      {display}
      {suffix}
    </Text>
  );
}

// ── Bars ──────────────────────────────────────────────────────────────────────

/** XP bar that fills with a timed sweep + accent glow (mockup clBar). */
export function AnimatedXPBar({
  current,
  needed,
  height = 6,
  delay = 150,
}: {
  current: number;
  needed: number;
  height?: number;
  delay?: number;
}): React.JSX.Element {
  const pct = needed > 0 ? Math.max(0, Math.min(1, current / needed)) : 0;
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(
      delay,
      withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [fill, pct, delay]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View
      style={{
        height,
        backgroundColor: "rgba(5,4,26,0.9)",
        borderWidth: 1,
        borderColor: colors.borderDefault,
        overflow: "hidden",
      }}
    >
      <Animated.View style={[{ height: "100%" }, fillStyle]}>
        <LinearGradient
          colors={[colors.brandBlue, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

// ── Reward effects ────────────────────────────────────────────────────────────

/** A single spark rising from the reward area. */
function Spark({ index }: { index: number }): React.JSX.Element {
  const progress = useSharedValue(0);
  // Deterministic pseudo-random per index so re-renders stay stable.
  const seed = (index * 9301 + 49297) % 233280;
  const rand = seed / 233280;
  const startX = 20 + rand * 200;
  const drift = (rand - 0.5) * 60;
  useEffect(() => {
    progress.value = withDelay(index * 120, withTiming(1, { duration: 1400 }));
  }, [progress, index]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.15 ? progress.value * 6 : 1 - progress.value,
    transform: [
      { translateX: startX + drift * progress.value },
      { translateY: -110 * progress.value },
      { scale: 0.6 + 0.5 * (1 - progress.value) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          bottom: 0,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: index % 3 === 0 ? colors.warning : colors.accent,
        },
        style,
      ]}
    />
  );
}

/** Burst of XP sparks behind a reward number. */
export function SparkBurst({ count = 10 }: { count?: number }): React.JSX.Element {
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }, (_, i) => (
        <Spark key={i} index={i} />
      ))}
    </View>
  );
}

/** Discreet pulsing ring drawn BEHIND the level badge. */
function PulseRing({ size }: { size: number }): React.JSX.Element {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.14 + t.value * 0.12,
    transform: [{ scale: 1 + t.value * 0.06 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: colors.accent,
        },
        style,
      ]}
    />
  );
}

/** Full-screen level-up celebration overlay (clean card + hexagon badge). */
export function LevelUpOverlay({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        backgroundColor: "rgba(2,1,14,0.9)",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <View
        style={{
          alignSelf: "stretch",
          alignItems: "center",
          gap: 16,
          paddingVertical: 34,
          paddingHorizontal: 24,
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.accent,
        }}
      >
        <Text variant="micro" style={{ color: colors.accent, letterSpacing: 3 }}>
          Niveau supérieur
        </Text>

        {/* Hexagon badge with the new level */}
        <View style={{ width: 150, height: 150, alignItems: "center", justifyContent: "center" }}>
          <PulseRing size={148} />
          <Svg width={120} height={120} viewBox="0 0 100 100" style={{ position: "absolute" }}>
            <Polygon
              points="50,4 89,27 89,73 50,96 11,73 11,27"
              fill="rgba(10,255,212,0.07)"
              stroke={colors.accent}
              strokeWidth={2.5}
            />
          </Svg>
          <PopIn delay={120}>
            <Text
              style={{
                fontFamily: `${fonts.sans}_800ExtraBold`,
                fontSize: 44,
                lineHeight: 54,
                color: colors.accent,
              }}
            >
              {level}
            </Text>
          </PopIn>
        </View>

        <Text variant="body" style={{ textAlign: "center", maxWidth: 240 }}>
          Continue comme ça, la machine est lancée.
        </Text>
        <PressableScale
          onPress={onClose}
          style={{
            marginTop: 4,
            alignSelf: "stretch",
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
          }}
        >
          <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
            Continuer
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}
