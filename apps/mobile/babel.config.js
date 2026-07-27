// babel-preset-expo handles Expo Router, JSX, and the RN runtime. No extra
// plugins are needed for expo-router in current Expo SDKs.
const path = require("node:path");

const expoRoot = path.dirname(require.resolve("expo/package.json"));
const expoPreset = require.resolve("babel-preset-expo", { paths: [expoRoot] });

module.exports = function (api) {
  api.cache(true);
  return {
    // pnpm does not expose Expo's transitive preset at the workspace root.
    presets: [expoPreset],
    // react-native-worklets/plugin powers react-native-reanimated v4 and MUST be
    // listed last. expo-router pulls reanimated + gesture-handler as peers.
    plugins: ["react-native-worklets/plugin"],
  };
};
