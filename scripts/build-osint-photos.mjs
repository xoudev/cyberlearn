#!/usr/bin/env node
/**
 * Builds the pictures of the <PhotoOsint> exercises, apps/web/public/osint:
 * illustrations drawn below as SVG, rendered to JPEG by sharp (the one next
 * ships), then given the metadata a phone writes: make, model, software, the
 * date, a GPS position and an altitude. No photo of anyone, no place anyone
 * lives: the positions are a lakeside promenade and a riverside quay, picked
 * for what the lessons teach.
 *
 *   node scripts/build-osint-photos.mjs
 *
 * The EXIF block is written by hand (TIFF, little-endian: IFD0, the Exif IFD
 * and the GPS IFD), so the files hold exactly the tags the exercises read and
 * nothing else. The output is deterministic.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// sharp is not a dependency of ours: next brings it, so it is resolved from next.
const fromWeb = createRequire(path.join(root, "apps/web/package.json"));
const fromNext = createRequire(fromWeb.resolve("next/package.json"));
const sharp = fromNext("sharp");

// ── The pictures ────────────────────────────────────────────────────────────

/** A lake under snowy peaks, a sailing boat, a wooden pontoon: a holiday photo. */
const LAKE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b9bd5"/><stop offset="1" stop-color="#cfe6f5"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8fb0"/><stop offset="1" stop-color="#1d5f7a"/></linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="960" cy="140" r="46" fill="#fff6d6" opacity="0.9"/>
  <path d="M0 470 L140 300 L250 380 L390 210 L520 360 L640 250 L780 390 L900 230 L1040 360 L1200 280 L1200 470 Z" fill="#6f7f8f"/>
  <path d="M390 210 L430 260 L410 258 L395 280 L372 250 L352 262 Z M900 230 L940 280 L918 276 L902 300 L884 270 L862 282 Z M640 250 L668 285 L650 282 L640 298 L626 280 Z" fill="#f4f7fa"/>
  <path d="M0 520 L120 420 L260 470 L380 400 L520 480 L700 420 L860 480 L1000 430 L1200 490 L1200 540 L0 540 Z" fill="#3e6b48"/>
  <rect y="530" width="1200" height="270" fill="url(#water)"/>
  <g fill="#ffffff" opacity="0.25">
    <rect x="80" y="575" width="160" height="3"/><rect x="420" y="610" width="220" height="3"/><rect x="760" y="590" width="180" height="3"/>
    <rect x="200" y="680" width="260" height="4"/><rect x="700" y="720" width="300" height="4"/>
  </g>
  <g transform="translate(700 560)">
    <path d="M0 40 L120 40 L105 58 L15 58 Z" fill="#f2f2f2"/>
    <path d="M58 38 L58 -70 L110 32 Z" fill="#ffffff"/><path d="M54 38 L54 -50 L10 32 Z" fill="#e8e1d0"/>
    <rect x="55" y="-72" width="3" height="112" fill="#555"/>
  </g>
  <g fill="#7a5a3a">
    <rect x="0" y="700" width="560" height="22"/>
    <rect x="40" y="722" width="10" height="78"/><rect x="200" y="722" width="10" height="78"/><rect x="360" y="722" width="10" height="78"/><rect x="520" y="722" width="10" height="78"/>
  </g>
  <rect x="0" y="690" width="560" height="10" fill="#94704a"/>
</svg>`;

/** Flooded quays under pastel facades, a white basilica on a wooded hill. */
const QUAYS = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e9aa6"/><stop offset="1" stop-color="#c9d0d6"/></linearGradient>
    <linearGradient id="flood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a7a5a"/><stop offset="1" stop-color="#5e5238"/></linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <path d="M0 330 C200 200 420 150 640 170 C860 190 1040 260 1200 300 L1200 420 L0 420 Z" fill="#5f7d4f"/>
  <g transform="translate(560 70)">
    <rect x="0" y="70" width="160" height="70" fill="#ece6d8"/>
    <rect x="-20" y="40" width="34" height="100" fill="#e4ddcd"/><rect x="146" y="40" width="34" height="100" fill="#e4ddcd"/>
    <rect x="-24" y="30" width="42" height="12" fill="#d8d0bf"/><rect x="142" y="30" width="42" height="12" fill="#d8d0bf"/>
    <rect x="70" y="10" width="20" height="60" fill="#e4ddcd"/><path d="M66 10 L80 -14 L94 10 Z" fill="#c9a640"/>
    <rect x="20" y="90" width="12" height="30" fill="#9a8f78"/><rect x="74" y="90" width="12" height="30" fill="#9a8f78"/><rect x="128" y="90" width="12" height="30" fill="#9a8f78"/>
  </g>
  <g>
    <rect x="0" y="380" width="150" height="260" fill="#e7b48a"/><rect x="150" y="360" width="140" height="280" fill="#f0d27a"/>
    <rect x="290" y="390" width="130" height="250" fill="#d98c6a"/><rect x="420" y="370" width="150" height="270" fill="#f2e2b8"/>
    <rect x="570" y="395" width="130" height="245" fill="#e9a07a"/><rect x="700" y="365" width="150" height="275" fill="#f4c98a"/>
    <rect x="850" y="385" width="140" height="255" fill="#dba67c"/><rect x="990" y="370" width="210" height="270" fill="#efd9a8"/>
  </g>
  <g fill="#4a5560" opacity="0.75">
    <rect x="30" y="420" width="26" height="40"/><rect x="90" y="420" width="26" height="40"/><rect x="30" y="500" width="26" height="40"/><rect x="90" y="500" width="26" height="40"/>
    <rect x="180" y="400" width="26" height="40"/><rect x="240" y="400" width="26" height="40"/><rect x="180" y="480" width="26" height="40"/><rect x="240" y="480" width="26" height="40"/>
    <rect x="315" y="430" width="26" height="40"/><rect x="370" y="430" width="26" height="40"/><rect x="450" y="410" width="26" height="40"/><rect x="510" y="410" width="26" height="40"/>
    <rect x="450" y="490" width="26" height="40"/><rect x="510" y="490" width="26" height="40"/><rect x="595" y="435" width="26" height="40"/><rect x="650" y="435" width="26" height="40"/>
    <rect x="730" y="405" width="26" height="40"/><rect x="790" y="405" width="26" height="40"/><rect x="730" y="485" width="26" height="40"/><rect x="790" y="485" width="26" height="40"/>
    <rect x="875" y="425" width="26" height="40"/><rect x="935" y="425" width="26" height="40"/><rect x="1020" y="410" width="26" height="40"/><rect x="1080" y="410" width="26" height="40"/><rect x="1140" y="410" width="26" height="40"/>
  </g>
  <rect x="0" y="600" width="1200" height="200" fill="url(#flood)"/>
  <g fill="#c8b98f" opacity="0.35">
    <rect x="60" y="640" width="200" height="4"/><rect x="420" y="670" width="260" height="4"/><rect x="820" y="650" width="220" height="4"/><rect x="250" y="730" width="320" height="5"/>
  </g>
  <g fill="#3d3d3d"><rect x="300" y="560" width="6" height="80"/><circle cx="303" cy="556" r="10" fill="#e0d8a8"/><rect x="880" y="560" width="6" height="80"/><circle cx="883" cy="556" r="10" fill="#e0d8a8"/></g>
  <g transform="translate(520 590)"><rect x="0" y="0" width="150" height="40" rx="8" fill="#b23b3b"/><rect x="20" y="-28" width="100" height="30" rx="6" fill="#9f3434"/><rect x="0" y="34" width="150" height="10" fill="#5e5238"/></g>
</svg>`;

/** The metadata of each picture: what the lesson's exercise reads back. */
const PICTURES = [
  {
    name: "lac-de-montagne",
    svg: LAKE,
    meta: {
      make: "Apple",
      model: "iPhone 13",
      software: "17.5.1",
      when: "2026:07:14 16:42:08",
      latitude: 45.8992,
      longitude: 6.1294,
      altitude: 448,
    },
  },
  {
    name: "quais-inondes",
    svg: QUAYS,
    meta: {
      make: "samsung",
      model: "SM-G991B",
      software: "G991BXXS9EXA1",
      when: "2024:05:21 08:13:55",
      latitude: 45.7623,
      longitude: 4.827,
      altitude: 168,
    },
  },
];

// ── EXIF, written by hand ────────────────────────────────────────────────────

const BYTE = 1;
const ASCII = 2;
const LONG = 4;
const RATIONAL = 5;

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

/**
 * An IFD placed at `start` (an offset in the TIFF): its entries sorted by
 * tag, then the values longer than four bytes, which the entries point at.
 */
function ifd(entries, start) {
  const sorted = [...entries].sort((a, b) => a.tag - b.tag);
  const dataStart = start + 2 + 12 * sorted.length + 4;
  const body = [];
  const data = [];
  let dataLength = 0;
  for (const { tag, type, count, raw } of sorted) {
    if (raw.length <= 4) {
      body.push(u16(tag), u16(type), u32(count), raw, Buffer.alloc(4 - raw.length));
    } else {
      body.push(u16(tag), u16(type), u32(count), u32(dataStart + dataLength));
      data.push(raw);
      dataLength += raw.length;
      if (dataLength % 2 === 1) {
        data.push(Buffer.alloc(1));
        dataLength += 1;
      }
    }
  }
  return Buffer.concat([u16(sorted.length), ...body, u32(0), ...data]);
}

function ascii(tag, text) {
  const raw = Buffer.from(`${text}\0`, "ascii");
  return { tag, type: ASCII, count: raw.length, raw };
}
function bytes(tag, values) {
  return { tag, type: BYTE, count: values.length, raw: Buffer.from(values) };
}
function rationals(tag, pairs) {
  const raw = Buffer.concat(pairs.flatMap(([n, d]) => [u32(n), u32(d)]));
  return { tag, type: RATIONAL, count: pairs.length, raw };
}
function pointer(tag, at) {
  return { tag, type: LONG, count: 1, raw: u32(at) };
}

/** 45.8992 as 45° 53' 57.12": degrees, minutes, then hundredths of a second. */
function dms(tag, value) {
  const degrees = Math.floor(value);
  const minutesF = (value - degrees) * 60;
  const minutes = Math.floor(minutesF);
  const seconds = Math.round((minutesF - minutes) * 60 * 100);
  return rationals(tag, [
    [degrees, 1],
    [minutes, 1],
    [seconds, 100],
  ]);
}

/** The APP1 segment: "Exif", then a TIFF with IFD0, the Exif IFD and the GPS IFD. */
function exifSegment({ make, model, software, when, latitude, longitude, altitude }) {
  const ifd0 = (exifAt, gpsAt) => [
    ascii(0x010f, make),
    ascii(0x0110, model),
    ascii(0x0131, software),
    ascii(0x0132, when),
    pointer(0x8769, exifAt),
    pointer(0x8825, gpsAt),
  ];
  const exif = [ascii(0x9003, when), ascii(0x9004, when)];
  const gps = [
    bytes(0x0000, [2, 3, 0, 0]),
    ascii(0x0001, latitude >= 0 ? "N" : "S"),
    dms(0x0002, Math.abs(latitude)),
    ascii(0x0003, longitude >= 0 ? "E" : "W"),
    dms(0x0004, Math.abs(longitude)),
    bytes(0x0005, [0]),
    rationals(0x0006, [[Math.round(altitude * 10), 10]]),
  ];
  // The pointers' values do not change the IFD's size: it is measured first.
  const exifAt = 8 + ifd(ifd0(0, 0), 8).length;
  const gpsAt = exifAt + ifd(exif, exifAt).length;
  const tiff = Buffer.concat([
    Buffer.from("II*\0", "ascii"),
    u32(8),
    ifd(ifd0(exifAt, gpsAt), 8),
    ifd(exif, exifAt),
    ifd(gps, gpsAt),
  ]);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "ascii"), tiff]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, 0xe1]), length, payload]);
}

/** The JPEG with the EXIF segment first; its JFIF one goes, a phone's file has none. */
function withExif(jpeg, meta) {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("not a JPEG");
  let rest = jpeg.subarray(2);
  if (rest[0] === 0xff && rest[1] === 0xe0) rest = rest.subarray(2 + rest.readUInt16BE(2));
  return Buffer.concat([Buffer.from([0xff, 0xd8]), exifSegment(meta), rest]);
}

// ── Build ─────────────────────────────────────────────────────────────────────

const out = path.join(root, "apps/web/public/osint");
mkdirSync(out, { recursive: true });
for (const picture of PICTURES) {
  const jpeg = await sharp(Buffer.from(picture.svg))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const file = withExif(jpeg, picture.meta);
  writeFileSync(path.join(out, `${picture.name}.jpg`), file);
  console.log(`osint/${picture.name}.jpg: ${String(Math.round(file.length / 1024))} KB`);
}
