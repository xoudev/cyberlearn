import React, { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { Text } from "@/components/ui";

// ── Skeleton (loading) ────────────────────────────────────────────────────────

/** One pulsing placeholder block. */
export function Bone({ style }: { style?: ViewStyle }): React.JSX.Element {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [opacity]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ backgroundColor: colors.bgOverlay, borderRadius: 2, height: 14 }, anim, style]}
    />
  );
}

/** Catalog-card shaped skeleton (mockup frame 13). */
export function CardSkeleton(): React.JSX.Element {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.bgElevated,
        padding: 16,
        gap: 10,
      }}
    >
      <Bone style={{ width: 90, height: 9 }} />
      <Bone style={{ width: "80%", height: 15 }} />
      <Bone style={{ width: "100%", height: 10 }} />
      <Bone style={{ width: "55%", height: 10 }} />
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

// ── Empty state (mockup frame 12) ─────────────────────────────────────────────

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View style={{ alignItems: "center", paddingVertical: 44, gap: 12 }}>
      <Svg
        width={44}
        height={44}
        viewBox="0 0 16 16"
        fill="none"
        stroke={colors.textDisabled}
        strokeWidth={1.1}
      >
        <Circle cx="7" cy="7" r="4.5" />
        <Path d="M10.5 10.5 L14 14" strokeLinecap="round" />
      </Svg>
      <Text variant="h3" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="bodySm" style={{ textAlign: "center", maxWidth: 260 }}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          style={{
            marginTop: 6,
            borderWidth: 1,
            borderColor: colors.accent,
            paddingHorizontal: 18,
            paddingVertical: 10,
          }}
        >
          <Text variant="micro" style={{ color: colors.accent }}>
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

// ── Network error (mockup frame 14) ───────────────────────────────────────────

export function ErrorState({
  onRetry,
  code = "NET_ERR",
}: {
  onRetry?: () => void;
  code?: string;
}): React.JSX.Element {
  return (
    <View style={{ alignItems: "center", paddingVertical: 44, gap: 12 }}>
      <Svg
        width={44}
        height={44}
        viewBox="0 0 16 16"
        fill="none"
        stroke={colors.danger}
        strokeWidth={1.1}
      >
        <Path d="M1.5 6 C5 2.8 11 2.8 14.5 6 M4 9 C6.4 7 9.6 7 12 9" strokeLinecap="round" />
        <Circle cx="8" cy="12" r="1" fill={colors.danger} />
      </Svg>
      <Text variant="h3">Connexion perdue</Text>
      <Text variant="bodySm" style={{ textAlign: "center", maxWidth: 260 }}>
        Impossible de charger le contenu. Vérifie ta connexion puis réessaie.
      </Text>
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          style={{
            marginTop: 6,
            backgroundColor: colors.accent,
            paddingHorizontal: 22,
            paddingVertical: 11,
          }}
        >
          <Text variant="micro" style={{ color: colors.bgBase }}>
            Réessayer
          </Text>
        </PressableScale>
      ) : null}
      <Text variant="micro" style={{ color: colors.textDisabled }}>
        Erreur · {code}
      </Text>
    </View>
  );
}
