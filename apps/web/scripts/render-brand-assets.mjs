import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Reuse the image processor Next already installs; this is an asset-authoring tool.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
// The existing PDF dependency supplies the font parser for this authoring script only.
const pdfRequire = createRequire(require.resolve("@react-pdf/renderer"));
const fontRequire = createRequire(pdfRequire.resolve("@react-pdf/font"));
const fontkit = fontRequire("fontkit");

const webRoot = new URL("../", import.meta.url);
const adminRoot = new URL("../../admin/", import.meta.url);
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
await icon(180, "app/apple-icon.png");

// Browser tabs need the mark at full height, without the launcher's safe zone or background.
const compactMark = source.toString().replace('viewBox="0 0 256 256"', 'viewBox="28 16 200 228"');
const tabIcon = compactMark
  .replaceAll('fill="#141518"', 'class="ink"')
  .replace(
    "</svg>",
    "<style>.ink{fill:#141518}@media(prefers-color-scheme:dark){.ink{fill:#F4F2ED}}</style></svg>",
  );
await writeFile(new URL("app/icon.svg", webRoot), tabIcon);
await writeFile(new URL("app/icon.svg", adminRoot), tabIcon);
const favicon = await sharp(Buffer.from(compactMark)).resize(32, 32).png().toBuffer();
await writeFile(new URL("public/brand/favicon-32.png", webRoot), favicon);

// ICO carries PNG data for browsers that do not use SVG icons.
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
const ico = Buffer.concat([header, favicon]);
await writeFile(new URL("app/favicon.ico", webRoot), ico);
await writeFile(new URL("app/favicon.ico", adminRoot), ico);
await copyFile(new URL("app/apple-icon.png", webRoot), new URL("app/apple-icon.png", adminRoot));

// Outline the real Barlow 700 wordmark so mail clients cannot replace it with a fallback font.
const font = fontkit.openSync(
  fileURLToPath(new URL("public/brand/fonts/BarlowCondensed-Bold.ttf", webRoot)),
);
const run = font.layout("CYBERLEARN.");
const scale = 30 / font.unitsPerEm;
let pen = 48;
const letters = run.glyphs.map((glyph, index) => {
  const position = run.positions[index];
  const x = pen + position.xOffset * scale;
  const y = 30.5 - position.yOffset * scale;
  const fill = index === run.glyphs.length - 1 ? "#FF6B2B" : "#141518";
  pen += position.xAdvance * scale - 0.3;
  return `<path d="${glyph.path.toSVG()}" transform="translate(${x} ${y}) scale(${scale} ${-scale})" fill="${fill}"/>`;
});
const mark = compactMark.replace(
  /<svg[^>]*>/u,
  '<svg x="0" y="2" width="36" height="36" viewBox="28 16 200 228" fill="none">',
);
const lockup = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40" viewBox="0 0 200 40">${mark}${letters.join("")}</svg>`;
await sharp(Buffer.from(lockup))
  .resize(600, 120)
  .png()
  .toFile(fileURLToPath(new URL("public/brand/email-lockup.png", webRoot)));
await mkdir(new URL("public/brand/", adminRoot), { recursive: true });
await copyFile(
  new URL("public/brand/email-lockup.png", webRoot),
  new URL("public/brand/email-lockup.png", adminRoot),
);
