/**
 * The geography of the <PhotoOsint> exercise: the distance between the
 * learner's point and the place of the photo, coordinates as a learner types
 * them, and the towns drawn on the map (no external tile: the map is the
 * Natural Earth outlines of public/maps plus these names).
 */

export interface Point {
  readonly latitude: number;
  readonly longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/** The great-circle distance, in kilometres (haversine). */
export function distanceKm(a: Point, b: Point): number {
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function inRange(point: Point): Point | null {
  return Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180 ? point : null;
}

/** 45° 53' 57.12" N; the seconds, or the minutes and seconds, may be left out. */
const DMS_RE =
  /(\d{1,3}(?:[.,]\d+)?)\s*°\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['’′]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:"|”|″|'')?)?)?\s*([NSEWO])/giu;

const decimal = (digits: string | undefined): number => Number((digits ?? "0").replace(",", "."));

/**
 * Coordinates as a learner writes them: decimal ("45.8992, 6.1294",
 * "45,8992 ; 6,1294") or as exiftool shows them (45° 53' 57.12" N, 6° 7'
 * 45.84" E; O for ouest is read as W). Null when it is neither.
 */
export function parseCoordinates(text: string): Point | null {
  const dms = [...text.matchAll(DMS_RE)];
  if (dms.length === 2) {
    const values = dms.map((m) => {
      const value = decimal(m[1]) + decimal(m[2]) / 60 + decimal(m[3]) / 3600;
      const ref = (m[4] ?? "").toUpperCase();
      return { value: ref === "S" || ref === "W" || ref === "O" ? -value : value, ref };
    });
    const lat = values.find((v) => v.ref === "N" || v.ref === "S");
    const lon = values.find((v) => v.ref !== "N" && v.ref !== "S");
    return lat && lon ? inRange({ latitude: lat.value, longitude: lon.value }) : null;
  }
  // Between the two numbers: a semicolon (then commas are decimal commas), a
  // single comma (then decimals take a dot), or spaces.
  const trimmed = text.trim();
  const commas = (trimmed.match(/,/gu) ?? []).length;
  const parts = trimmed.includes(";")
    ? trimmed.split(";")
    : commas === 1
      ? trimmed.split(",")
      : trimmed.split(/\s+/u);
  if (parts.length !== 2) return null;
  const [lat, lon] = parts.map((p) => p.trim().replace(/,$/u, "").replace(",", "."));
  if (
    lat === undefined ||
    lon === undefined ||
    !/^-?\d+(\.\d+)?$/u.test(lat) ||
    !/^-?\d+(\.\d+)?$/u.test(lon)
  ) {
    return null;
  }
  return inRange({ latitude: Number(lat), longitude: Number(lon) });
}

/** A distance said in French, rounded as a map would: 800 m, 12 km, 312 km. */
export function distanceLabel(km: number): string {
  if (km < 1) return `${String(Math.max(10, Math.round(km * 100) * 10))} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${String(Math.round(km))} km`;
}

export interface Town extends Point {
  readonly name: string;
  /** 1: labelled at every zoom; 2: once the map is close enough. */
  readonly rank: 1 | 2;
}

/** The towns on the map: the big cities, then enough others to find a place. */
export const TOWNS: readonly Town[] = [
  { name: "Paris", latitude: 48.857, longitude: 2.352, rank: 1 },
  { name: "Marseille", latitude: 43.297, longitude: 5.37, rank: 1 },
  { name: "Lyon", latitude: 45.764, longitude: 4.836, rank: 1 },
  { name: "Toulouse", latitude: 43.605, longitude: 1.444, rank: 1 },
  { name: "Nice", latitude: 43.71, longitude: 7.262, rank: 1 },
  { name: "Nantes", latitude: 47.218, longitude: -1.554, rank: 1 },
  { name: "Strasbourg", latitude: 48.573, longitude: 7.752, rank: 1 },
  { name: "Bordeaux", latitude: 44.838, longitude: -0.579, rank: 1 },
  { name: "Lille", latitude: 50.629, longitude: 3.057, rank: 1 },
  { name: "Montpellier", latitude: 43.611, longitude: 3.877, rank: 2 },
  { name: "Rennes", latitude: 48.117, longitude: -1.678, rank: 2 },
  { name: "Reims", latitude: 49.258, longitude: 4.032, rank: 2 },
  { name: "Le Havre", latitude: 49.494, longitude: 0.108, rank: 2 },
  { name: "Rouen", latitude: 49.443, longitude: 1.099, rank: 2 },
  { name: "Caen", latitude: 49.183, longitude: -0.37, rank: 2 },
  { name: "Brest", latitude: 48.39, longitude: -4.486, rank: 2 },
  { name: "Tours", latitude: 47.394, longitude: 0.685, rank: 2 },
  { name: "Orléans", latitude: 47.903, longitude: 1.909, rank: 2 },
  { name: "Angers", latitude: 47.478, longitude: -0.563, rank: 2 },
  { name: "Dijon", latitude: 47.322, longitude: 5.041, rank: 2 },
  { name: "Besançon", latitude: 47.238, longitude: 6.024, rank: 2 },
  { name: "Metz", latitude: 49.12, longitude: 6.176, rank: 2 },
  { name: "Limoges", latitude: 45.834, longitude: 1.261, rank: 2 },
  { name: "Clermont-Ferrand", latitude: 45.778, longitude: 3.087, rank: 2 },
  { name: "Grenoble", latitude: 45.188, longitude: 5.725, rank: 2 },
  { name: "Annecy", latitude: 45.899, longitude: 6.129, rank: 2 },
  { name: "Chambéry", latitude: 45.564, longitude: 5.918, rank: 2 },
  { name: "Saint-Étienne", latitude: 45.44, longitude: 4.387, rank: 2 },
  { name: "Avignon", latitude: 43.949, longitude: 4.806, rank: 2 },
  { name: "Toulon", latitude: 43.124, longitude: 5.928, rank: 2 },
  { name: "Perpignan", latitude: 42.699, longitude: 2.895, rank: 2 },
  { name: "Pau", latitude: 43.295, longitude: -0.37, rank: 2 },
  { name: "Biarritz", latitude: 43.483, longitude: -1.559, rank: 2 },
  { name: "La Rochelle", latitude: 46.16, longitude: -1.151, rank: 2 },
  { name: "Poitiers", latitude: 46.58, longitude: 0.34, rank: 2 },
  { name: "Ajaccio", latitude: 41.919, longitude: 8.738, rank: 2 },
  { name: "Genève", latitude: 46.204, longitude: 6.143, rank: 2 },
  { name: "Bruxelles", latitude: 50.847, longitude: 4.357, rank: 2 },
];
