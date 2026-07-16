import React from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

const OUTER = "50,1 96,25.5 96,74.5 50,99 4,74.5 4,25.5";
const INNER = "50,7 89,28 89,72 50,93 11,72 11,28";

/** Hexagonal avatar with the user's initials, tinted by the equipped accent. */
export function HexAvatar({
  initials,
  size = 76,
  color,
}: {
  initials: string;
  size?: number;
  color?: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const contentColor = color ?? theme.accent;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute" }}>
        {theme.frame.strokeWidth > 0 ? (
          <Polygon
            points={OUTER}
            fill="none"
            stroke={theme.frame.color}
            strokeWidth={theme.frame.strokeWidth + 2}
            opacity={theme.frame.glowOpacity}
          />
        ) : null}
        <Polygon
          points={OUTER}
          fill={theme.accent}
          fillOpacity={theme.hex.fillOpacity}
          stroke={theme.accent}
          strokeWidth={theme.hex.strokeWidth}
          strokeDasharray={theme.hex.dash}
        />
        <Polygon points={INNER} fill={colors.bgBase} />
        {theme.frame.strokeWidth > 0 ? (
          <Polygon
            points={OUTER}
            fill="none"
            stroke={theme.frame.color}
            strokeWidth={theme.frame.strokeWidth}
          />
        ) : null}
      </Svg>
      <Text
        style={{
          fontFamily: `${fonts.sans}_800ExtraBold`,
          fontSize: size * 0.3,
          color: contentColor,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
