// babel-preset-expo handles Expo Router, JSX, and the RN runtime. No extra
// plugins are needed for expo-router in current Expo SDKs.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
