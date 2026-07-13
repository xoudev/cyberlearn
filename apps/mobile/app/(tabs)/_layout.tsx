import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@cyberlearn/tokens";
import { BookIcon, HomeIcon, RouteIcon, UserIcon } from "@/components/icons";
import { TourGate } from "@/components/tour";

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <TourGate />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: "rgba(3,2,25,0.97)",
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
            height: 54 + insets.bottom,
            paddingBottom: insets.bottom + 4,
            paddingTop: 6,
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
