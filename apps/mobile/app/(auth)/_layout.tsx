import { Stack } from "expo-router";
import type React from "react";
import { colors } from "@cyberlearn/tokens";

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}
    />
  );
}
