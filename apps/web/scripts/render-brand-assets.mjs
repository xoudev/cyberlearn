import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Reuse the image processor Next already installs; this is an asset-authoring tool.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");

const webRoot = new URL("../", import.meta.url);
const source = await readFile(new URL("public/brand/bastion-mark.svg", webRoot));
await sharp(source)
  .resize(256, 256)
  .png()
  .toFile(fileURLToPath(new URL("public/brand/bastion-mark.png", webRoot)));

async function icon(size, target) {
  const markSize = Math.round(size * 0.64);
  const mark = await sharp(source).resize(markSize, markSize).png().toBuffer();
  const output = await sharp({
    create: { width: size, height: size, channels: 4, background: "#EAE7DF" },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
  await writeFile(new URL(target, webRoot), output);
  return output;
}

await icon(192, "public/icon-192.png");
await icon(512, "public/icon-512.png");
await icon(512, "app/icon.png");
await icon(180, "app/apple-icon.png");

// ICO can carry PNG data. The 32 px entry stays square and readable in browser tabs.
const favicon = await icon(32, "public/brand/favicon-32.png");
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(new URL("app/favicon.ico", webRoot), Buffer.concat([header, favicon]));
