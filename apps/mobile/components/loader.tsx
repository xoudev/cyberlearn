import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@cyberlearn/tokens";
import { Logo } from "@/components/logo";
import { Text } from "@/components/ui";

/** Indeterminate accent sweep bar. */
function SweepBar({ width = 180 }: { width?: number }): React.JSX.Element {
  const x = useSharedValue(-0.5);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(1.5, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
      -1,
    );
  }, [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width }] }));
  return (
    <View
      style={{
        width,
        height: 3,
        backgroundColor: colors.borderSubtle,
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      <Animated.View
        style={[{ width: width * 0.4, height: "100%", backgroundColor: colors.accent }, style]}
      />
    </View>
  );
}

/** Full-screen branded loading state (fonts boot, cold session gate). */
export function BrandedLoader({ label = "Chargement" }: { label?: string }): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgBase,
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
      }}
    >
      <Logo size={64} layout="column" />
      <SweepBar />
      <Text variant="micro" style={{ color: colors.textMuted, letterSpacing: 2 }}>
        {label}
      </Text>
    </View>
  );
}
