import { resolve } from "node:path";

// Lint-staged config as a module so we can use functions.
// Needed because:
// 1. Paths under app/(app)/lessons/[slug]/ contain glob special chars that biome
//    misinterprets when passed as bare strings; absolute paths bypass this.
// 2. docs/ is in biome's files.ignore list; we filter those out to avoid the
//    "No files were processed" error that would abort the commit.
// Vendor runtime files are committed as-is from CDN and must not be reformatted.
const isRuntimeFile = (f) => f.includes("/public/runtimes/");
// docs/ holds design mockups (.jsx/.html/.css), not app code: biome ignores
// them via files.ignore, so passing them along would abort the commit with
// "No files were processed". Normalize separators so Windows paths match too.
const isDocsFile = (f) => f.replace(/\\/g, "/").includes("/docs/");

export default {
  // Read-only, and it picks its own scope (apps, packages, content): see the script.
  "*": (files) =>
    `node scripts/check-typography.mjs ${files.map((f) => JSON.stringify(resolve(f))).join(" ")}`,

  "*.{ts,tsx,js,jsx,mjs,cjs}": (files) => {
    const biomeFiles = files.filter((f) => !isRuntimeFile(f) && !isDocsFile(f));
    if (biomeFiles.length === 0) return [];
    return `biome format --write ${biomeFiles.map((f) => JSON.stringify(resolve(f))).join(" ")}`;
  },

  "*.{json,css,md}": (files) => {
    // .md is not supported by biome's formatter
    const biomeFiles = files.filter(
      (f) => !isDocsFile(f) && !f.endsWith(".md") && !isRuntimeFile(f),
    );
    if (biomeFiles.length === 0) return [];
    return `biome format --write ${biomeFiles.map((f) => JSON.stringify(resolve(f))).join(" ")}`;
  },
};
