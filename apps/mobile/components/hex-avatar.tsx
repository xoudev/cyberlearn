import React from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";

const OUTER = "50,1 96,25.5 96,74.5 50,99 4,74.5 4,25.5";
const INNER = "50,7 89,28 89,72 50,93 11,72 11,28";

/** Hexagonal avatar with the user's initials, tinted by the equipped accent. */
export function HexAvatar({
  initials,
  size = 76,
  color = colors.accent,
}: {
  initials: string;
  size?: number;
  color?: string;
}): React.JSX.Element {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute" }}>
        <Polygon points={OUTER} fill={color} opacity={0.9} />
        <Polygon points={INNER} fill={colors.bgBase} />
      </Svg>
      <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: size * 0.3, color }}>
        {initials}
      </Text>
    </View>
  );
}
