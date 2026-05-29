import { resolve } from "node:path";

// Lint-staged config as a module so we can use functions.
// Needed because:
// 1. Paths under app/(app)/lessons/[slug]/ contain glob special chars that biome
//    misinterprets when passed as bare strings — absolute paths bypass this.
// 2. docs/ is in biome's files.ignore list — we filter those out to avoid the
//    "No files were processed" error that would abort the commit.
// Vendor runtime files are committed as-is from CDN — must not be reformatted.
const isRuntimeFile = (f) => f.includes("/public/runtimes/");

export default {
  "*.{ts,tsx,js,jsx,mjs,cjs}": (files) => {
    const biomeFiles = files.filter((f) => !isRuntimeFile(f));
    if (biomeFiles.length === 0) return [];
    return `biome format --write ${biomeFiles.map((f) => JSON.stringify(resolve(f))).join(" ")}`;
  },

  "*.{json,css,md}": (files) => {
    // docs/ is in biome's ignore list; .md is not supported by biome's formatter
    const biomeFiles = files.filter(
      (f) => !f.includes("/docs/") && !f.endsWith(".md") && !isRuntimeFile(f),
    );
    if (biomeFiles.length === 0) return [];
    return `biome format --write ${biomeFiles.map((f) => JSON.stringify(resolve(f))).join(" ")}`;
  },
};
