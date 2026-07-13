import React from "react";
import { Image, View, type ViewStyle } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";

// The real CyberLearn mark: shield + keyhole + mesh (same asset as the web).
// SAFETY: Metro types require() of images as number (asset module id).
const MARK = require("../assets/logo.png") as number;

export function LogoMark({ size = 40 }: { size?: number }): React.JSX.Element {
  return <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />;
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
          gap: layout === "row" ? 10 : 14,
        },
        style,
      ]}
    >
      <LogoMark size={size} />
      {showWordmark ? (
        <Text
          style={{
            fontFamily: `${fonts.sans}_800ExtraBold`,
            fontSize: Math.max(14, size * 0.32),
            letterSpacing: size * 0.05,
            color: colors.textPrimary,
          }}
        >
          CYBER
          <Text
            style={{
              color: colors.accent,
              fontFamily: `${fonts.sans}_800ExtraBold`,
              fontSize: Math.max(14, size * 0.32),
            }}
          >
            LEARN
          </Text>
        </Text>
      ) : null}
    </View>
  );
}
