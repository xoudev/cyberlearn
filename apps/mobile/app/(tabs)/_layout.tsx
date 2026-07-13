import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@cyberlearn/tokens";
import { BookIcon, HomeIcon, RouteIcon, UserIcon } from "@/components/icons";
import { TourAutoStart } from "@/components/tour";

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <TourAutoStart />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bgBase },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          // Floating rounded dock instead of the default edge-to-edge bar.
          tabBarStyle: {
            position: "absolute",
            left: 14,
            right: 14,
            bottom: Math.max(insets.bottom, 12),
            height: 62,
            borderRadius: 22,
            borderWidth: 1,
            borderTopWidth: 1,
            borderColor: colors.borderDefault,
            borderTopColor: colors.borderDefault,
            backgroundColor: "rgba(8,6,34,0.97)",
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: "#000",
            shadowOpacity: 0.5,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontFamily: `${fonts.mono}_500Medium`,
            fontSize: 9,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          },
        }}
      >
        <Tabs.Screen
          name="accueil"
          options={{
            title: "Accueil",
            tabBarIcon: ({ color, focused }) => (
              <HomeIcon color={color} size={22} strokeWidth={focused ? 1.9 : 1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="parcours"
          options={{
            title: "Parcours",
            tabBarIcon: ({ color, focused }) => (
              <RouteIcon color={color} size={22} strokeWidth={focused ? 1.9 : 1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="lecons"
          options={{
            title: "Leçons",
            tabBarIcon: ({ color, focused }) => (
              <BookIcon color={color} size={22} strokeWidth={focused ? 1.9 : 1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, focused }) => (
              <UserIcon color={color} size={22} strokeWidth={focused ? 1.9 : 1.5} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
