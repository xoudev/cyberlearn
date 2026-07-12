import type { ExpoConfig } from "expo/config";

// Public Supabase config is injected at build time from EXPO_PUBLIC_* env vars.
// Only the anon key + URL ship in the bundle (both public / RLS-protected).
const config: ExpoConfig = {
  name: "CyberLearn",
  slug: "cyberlearn-mobile",
  scheme: "cyberlearn",
  version: "0.0.1",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  backgroundColor: "#030219",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "fr.cyberlearn.app",
  },
  android: {
    package: "fr.cyberlearn.app",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundColor: "#030219",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "expo-font",
    "expo-splash-screen",
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

export default config;
