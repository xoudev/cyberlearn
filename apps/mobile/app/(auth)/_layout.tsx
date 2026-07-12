import { Stack } from "expo-router";
import React from "react";
import { colors } from "@cyberlearn/tokens";

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}
    />
  );
}
