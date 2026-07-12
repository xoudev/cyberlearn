// babel-preset-expo handles Expo Router, JSX, and the RN runtime. No extra
// plugins are needed for expo-router in current Expo SDKs.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets/plugin powers react-native-reanimated v4 and MUST be
    // listed last. expo-router pulls reanimated + gesture-handler as peers.
    plugins: ["react-native-worklets/plugin"],
  };
};
