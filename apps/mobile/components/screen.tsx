import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@cyberlearn/tokens";

/** Layered depth background: base -> deep navy glow at the top. */
function Backdrop(): React.JSX.Element {
  return (
    <LinearGradient
      colors={["#0A0630", "#040220", colors.bgBase]}
      locations={[0, 0.35, 0.8]}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

/** Dark full-height screen with safe-area top padding and standard gutters. */
export function Screen({
  children,
  scroll = true,
  padForTabBar = false,
  onRefresh,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Reserve space for the floating tab dock (tab screens only). */
  padForTabBar?: boolean;
  /** Enables pull-to-refresh; should return a promise that settles when done. */
  onRefresh?: () => Promise<unknown>;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const padTop = insets.top + 10;
  // Floating dock: 62px tall, offset max(insets.bottom, 12) from the bottom.
  const dockClearance = 62 + Math.max(insets.bottom, 12) + 18;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async (): Promise<void> => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
        <Backdrop />
        <View
          style={{
            flex: 1,
            paddingTop: padTop,
            paddingHorizontal: 18,
            // Footer buttons (lesson reader) must clear the gesture/nav bar.
            paddingBottom: padForTabBar ? dockClearance : Math.max(insets.bottom, 10),
          }}
        >
          {children}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <Backdrop />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: padTop,
          paddingHorizontal: 18,
          paddingBottom: padForTabBar ? dockClearance + 16 : 44,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.bgElevated}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}
