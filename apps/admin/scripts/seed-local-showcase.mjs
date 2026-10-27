import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// The import validator mixes workspace TypeScript and ESM-only MDX packages.
// Reuse Vitest's installed Vite loader instead of adding a second bundler.
const require = createRequire(import.meta.url);
const vitePath = require.resolve("vite", { paths: [require.resolve("vitest/package.json")] });
const { createServer } = await import(pathToFileURL(vitePath).href);
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  ssr: { noExternal: [/^@cyberlearn\//] },
});
try {
  await server.ssrLoadModule(fileURLToPath(new URL("./seed-local-showcase.ts", import.meta.url)));
} finally {
  await server.close();
}
