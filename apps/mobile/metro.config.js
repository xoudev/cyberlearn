// Metro config tuned for a pnpm monorepo: watch the workspace root so shared
// packages (@cyberlearn/tokens, /types, /lib source .ts) are bundled, and let
// Metro resolve pnpm's symlinked node_modules.
//
// If Metro ever fails to resolve a hoisted dependency, the fallback is to set
// `node-linker=hoisted` in the ROOT .npmrc and reinstall (bigger blast radius,
// affects apps/web + apps/admin, so only if needed).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so the shared TS packages are seen).
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Keep hierarchical lookup ENABLED so Metro can walk up into pnpm's nested
//    `.pnpm/<pkg>/node_modules` to find each package's own transitive deps
//    (e.g. expo-router -> @expo/metro-runtime). Symlink following is on by
//    default in this Metro version.

module.exports = config;
