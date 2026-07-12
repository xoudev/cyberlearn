import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@cyberlearn/tokens";

/** Dark full-height screen with safe-area top padding and standard gutters. */
export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const padTop = insets.top + 10;

  if (!scroll) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgBase,
          paddingTop: padTop,
          paddingHorizontal: 18,
        }}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      contentContainerStyle={{ paddingTop: padTop, paddingHorizontal: 18, paddingBottom: 44 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
