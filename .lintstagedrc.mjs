import { resolve } from "node:path";

// Lint-staged config as a module so we can use functions.
// Needed because:
// 1. Paths under app/(app)/lessons/[slug]/ contain glob special chars that biome
//    misinterprets when passed as bare strings — absolute paths bypass this.
// 2. docs/ is in biome's files.ignore list — we filter those out to avoid the
//    "No files were processed" error that would abort the commit.
export default {
  "*.{ts,tsx,js,jsx,mjs,cjs}": (files) =>
    `biome format --write ${files.map((f) => JSON.stringify(resolve(f))).join(" ")}`,

  "*.{json,css,md}": (files) => {
    // lint-staged passes absolute paths — check for /docs/ anywhere in the path
    const biomeFiles = files.filter((f) => !f.includes("/docs/"));
    if (biomeFiles.length === 0) return [];
    return `biome format --write ${biomeFiles.map((f) => JSON.stringify(resolve(f))).join(" ")}`;
  },
};
