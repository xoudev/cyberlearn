import React from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";

/** The CyberLearn mark: an ascending "A" chevron, brandBlue -> accent gradient. */
export function LogoMark({ size = 40 }: { size?: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="clmark" x1="0" y1="48" x2="48" y2="0">
          <Stop offset="0" stopColor={colors.brandBlue} />
          <Stop offset="1" stopColor={colors.accent} />
        </LinearGradient>
      </Defs>
      {/* Left leg */}
      <Path d="M7 40 L24 8" stroke="url(#clmark)" strokeWidth={6.5} strokeLinecap="round" />
      {/* Right leg */}
      <Path d="M41 40 L24 8" stroke="url(#clmark)" strokeWidth={6.5} strokeLinecap="round" />
      {/* Crossbar */}
      <Path d="M15.5 25 L32.5 25" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

/** Mark + "CYBER LEARN" wordmark, stacked or inline. */
export function Logo({
  size = 40,
  showWordmark = true,
  layout = "row",
  style,
}: {
  size?: number;
  showWordmark?: boolean;
  layout?: "row" | "column";
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <View
      style={[
        {
          flexDirection: layout === "row" ? "row" : "column",
          alignItems: "center",
          gap: layout === "row" ? 10 : 12,
        },
        style,
      ]}
    >
      <LogoMark size={size} />
      {showWordmark ? (
        <Text
          style={{
            fontFamily: `${fonts.sans}_800ExtraBold`,
            fontSize: size * 0.4,
            letterSpacing: size * 0.06,
            color: colors.textPrimary,
          }}
        >
          CYBER LEARN
        </Text>
      ) : null}
    </View>
  );
}
