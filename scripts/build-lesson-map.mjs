#!/usr/bin/env node
/**
 * Builds the map of the <PhotoOsint> exercises, apps/web/public/maps/
 * france-voisins.geojson: the outlines of France and its neighbours, from
 * Natural Earth 1:50m (public domain), with the parts outside the view
 * (Guyane, La Réunion, the Canaries) dropped and the coordinates rounded to
 * three decimals, about a hundred metres. 69 KB instead of 3 MB, so the site
 * serves the map itself: no tile server learns who looks at it.
 *
 *   node scripts/build-lesson-map.mjs
 *
 * The source is fetched from the Natural Earth repository at a fixed tag and
 * checked against its SHA-256 before anything is read from it. The output is
 * deterministic: running the script again changes nothing unless the source
 * or this file did.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson";
const SOURCE_SHA256 = "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb";

/** ISO codes of the countries drawn: France and what shares the view with it. */
const KEEP = new Set([
  "FRA",
  "BEL",
  "LUX",
  "DEU",
  "CHE",
  "ITA",
  "ESP",
  "AND",
  "MCO",
  "NLD",
  "GBR",
  "AUT",
  "LIE",
  "PRT",
  "IRL",
  "SMR",
  "VAT",
]);
/** Metropolitan France with a margin; a polygon with no point in it is dropped. */
const VIEW = { west: -12, east: 16, south: 35, north: 56 };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "apps/web/public/maps/france-voisins.geojson");

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE}: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (sha256 !== SOURCE_SHA256) {
  throw new Error(`The Natural Earth file is not the one expected: sha256 ${sha256}`);
}
const world = JSON.parse(bytes.toString("utf8"));

const round = (n) => Math.round(n * 1000) / 1000;

/** A ring with its points rounded, consecutive duplicates dropped; null if too few remain. */
function ring(points) {
  const out = [];
  for (const [lon, lat] of points) {
    const p = [round(lon), round(lat)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
}

function inView(polygon) {
  return polygon[0].some(
    ([lon, lat]) => lon >= VIEW.west && lon <= VIEW.east && lat >= VIEW.south && lat <= VIEW.north,
  );
}

const features = [];
for (const feature of world.features) {
  const code = feature.properties.ADM0_A3;
  if (!KEEP.has(code)) continue;
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const kept = polygons
    .filter(inView)
    .map((polygon) => polygon.map(ring).filter((r) => r !== null))
    .filter((polygon) => polygon.length > 0);
  if (kept.length === 0) continue;
  features.push({
    type: "Feature",
    properties: { code, name: feature.properties.NAME_FR },
    geometry: { type: "MultiPolygon", coordinates: kept },
  });
}

mkdirSync(path.dirname(output), { recursive: true });
const json = JSON.stringify({ type: "FeatureCollection", features });
writeFileSync(output, json);
console.log(
  `${path.relative(root, output)}: ${String(features.length)} countries, ${String(Math.round(json.length / 1024))} KB`,
);
