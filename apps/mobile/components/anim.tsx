import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Pressable, type PressableProps, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts, radius } from "@cyberlearn/tokens";
import { AppModal } from "@/components/app-modal";
import { Text } from "@/components/ui";
import { useReducedMotionPreference } from "@/lib/accessibility";
import { useCosmetics } from "@/lib/cosmetics";

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
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.82 } : null]}
    >
      {children}
    </Pressable>
  );
}

/** Short eased reveal for reward content, without overshoot or bounce. */
export function PopIn({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  const reducedMotion = useReducedMotionPreference();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, delay, reducedMotion]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 6 }],
  }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

// ── Loops ─────────────────────────────────────────────────────────────────────

/** Soft opacity pulse for live indicators, without spatial movement. */
export function Pulse({
  children,
  style,
  amplitude = 1.06,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  amplitude?: number;
}): React.JSX.Element {
  const reducedMotion = useReducedMotionPreference();
  const progress = useSharedValue(0);
  const minOpacity = Math.max(0.76, 1 - (amplitude - 1) * 3);
  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [progress, reducedMotion]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: minOpacity + (1 - minOpacity) * progress.value,
  }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/** Animated count-up number (XP gains, ranks). */
export function CountUp({
  to,
  duration = 650,
  prefix = "",
  suffix = "",
  fontSize = 30,
  color,
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
  const { theme } = useCosmetics();
  const reducedMotion = useReducedMotionPreference();
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (reducedMotion) {
      progress.value = to;
      setDisplay(to);
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(to, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, to, duration, delay, reducedMotion]);
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
        color: color ?? theme.accent,
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
  const { theme } = useCosmetics();
  const reducedMotion = useReducedMotionPreference();
  const pct = needed > 0 ? Math.max(0, Math.min(1, current / needed)) : 0;
  const fill = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      fill.value = pct;
      return;
    }
    fill.value = withDelay(
      delay,
      withTiming(pct, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
  }, [fill, pct, delay, reducedMotion]);
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
          colors={[colors.brandBlue, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

// ── Reward effects ────────────────────────────────────────────────────────────

/** Focused level-up dialog shown after the lesson result is saved. */
export function LevelUpOverlay({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();

  return (
    <AppModal visible onClose={onClose} closeDisabled>
      <View style={{ alignItems: "center", gap: 12, paddingTop: 4 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.sm,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${theme.accent}16`,
          }}
        >
          <Text
            style={{
              fontFamily: `${fonts.mono}_700Bold`,
              fontSize: 24,
              lineHeight: 30,
              color: theme.accent,
            }}
          >
            ↑
          </Text>
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            Nouveau palier
          </Text>
          <Text
            style={{
              fontFamily: `${fonts.sans}_800ExtraBold`,
              fontSize: 30,
              lineHeight: 38,
              color: colors.textPrimary,
            }}
          >
            Niveau {level}
          </Text>
          <Text variant="body" style={{ textAlign: "center", maxWidth: 280 }}>
            Ton expérience a franchi un nouveau cap. Le prochain objectif est déjà en vue.
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 4,
          borderRadius: radius.sm,
          backgroundColor: colors.bgOverlay,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 3,
        }}
      >
        <Text variant="micro" style={{ color: colors.success }}>
          Progression enregistrée
        </Text>
        <Text variant="bodySm">Ton nouveau niveau est actif sur ton profil.</Text>
      </View>

      <PressableScale
        onPress={onClose}
        style={{
          marginTop: 6,
          alignSelf: "stretch",
          minHeight: 50,
          borderRadius: radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.accent,
        }}
      >
        <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
          Voir mon résultat
        </Text>
      </PressableScale>
    </AppModal>
  );
}
