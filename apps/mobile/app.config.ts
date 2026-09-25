import type { ExpoConfig } from "expo/config";

// Public Supabase config is injected at build time from EXPO_PUBLIC_* env vars.
// Only the anon key + URL ship in the bundle (both public / RLS-protected).
const config: ExpoConfig = {
  name: "CyberLearn",
  slug: "cyberlearn-mobile",
  owner: "xoudark",
  scheme: "cyberlearn",
  version: "2.3.1",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  backgroundColor: "#030219",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "fr.cyberlearn.app",
    buildNumber: "2",
  },
  android: {
    package: "fr.cyberlearn.mobile",
    versionCode: 9,
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
    [
      "expo-image-picker",
      {
        // The library only, for a photo avatar: no camera, no microphone.
        photosPermission:
          "CyberLearn accède à tes photos pour que tu puisses en choisir une comme avatar.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        // Dark brand splash instead of the default white screen.
        backgroundColor: "#030219",
        image: "./assets/splash-icon.png",
        imageWidth: 180,
        resizeMode: "contain",
      },
    ],
  ],
  extra: {
    // EAS project link. Remote EAS builds manage their own version code;
    // versionCode above remains the source of truth for local release builds.
    eas: { projectId: "24922f83-b503-41fc-9e97-f271f2974062" },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

export default config;
