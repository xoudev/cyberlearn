import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@cyberlearn/tokens";
import { useCosmetics } from "@/lib/cosmetics";

/** Dark full-height screen with safe-area top padding and standard gutters. */
export function Screen({
  children,
  scroll = true,
  onRefresh,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Enables pull-to-refresh; should return a promise that settles when done. */
  onRefresh?: () => Promise<unknown>;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const insets = useSafeAreaInsets();
  const padTop = insets.top + 10;
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
        <View
          style={{
            flex: 1,
            paddingTop: padTop,
            paddingHorizontal: 18,
            // Footer buttons (lesson reader) must clear the gesture/nav bar.
            paddingBottom: Math.max(insets.bottom, 10),
          }}
        >
          {children}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: padTop,
          paddingHorizontal: 18,
          paddingBottom: 44,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={theme.accent}
              colors={[theme.accent]}
              progressBackgroundColor={colors.bgElevated}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {/* The status bar is translucent: without this strip, scrolled content
          (the profile's tier pill) shows through behind the clock. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.bgBase,
        }}
      />
    </View>
  );
}
