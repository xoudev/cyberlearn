import fs from "node:fs";
import path from "node:path";

/**
 * Loads the monorepo-root `.env` files into `process.env` so that Next.js
 * inlines `NEXT_PUBLIC_*` variables at build time even though `next dev`
 * runs from an app directory (apps/web, apps/admin) and only reads `.env`
 * files relative to that directory by default.
 *
 * Precedence (highest wins): shell env > .env.local > .env. An existing
 * key is never overwritten, matching dotenv / @next/env semantics.
 *
 * @param {string} rootDir Absolute path to the monorepo root.
 */
export function loadRootEnv(rootDir) {
  // Keys present before we start come from the real shell — never override them.
  const shellKeys = new Set(Object.keys(process.env));

  // Lower-priority file first; .env.local then overrides .env (but not shell).
  for (const file of [".env", ".env.local"]) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const eq = line.indexOf("=");
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      if (!key) continue;

      let value = line.slice(eq + 1).trim();
      // Strip a single pair of surrounding quotes, if present.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // .env.local overrides .env, but the real shell env always wins.
      if (!shellKeys.has(key)) {
        process.env[key] = value;
      }
    }
  }
}
