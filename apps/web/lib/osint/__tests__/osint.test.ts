import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import exifr from "exifr";
import { describe, expect, it } from "vitest";
import { parsePhotoOsint } from "@cyberlearn/types";
import { distanceKm, distanceLabel, parseCoordinates, TOWNS } from "../geo";
import { metadataRows, RAW_EXIF_OPTIONS, readMetadata } from "../metadata";

const PUBLIC = path.resolve(__dirname, "../../../public");
const LESSONS = path.resolve(__dirname, "../../../../../content/lessons");

function bytes(file: string): ArrayBuffer {
  const buffer = readFileSync(path.join(PUBLIC, file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe("parseCoordinates", () => {
  it("reads decimal coordinates, with a dot or a French comma", () => {
    expect(parseCoordinates("45.8992, 6.1294")).toEqual({ latitude: 45.8992, longitude: 6.1294 });
    expect(parseCoordinates("45,8992 ; 6,1294")).toEqual({ latitude: 45.8992, longitude: 6.1294 });
    expect(parseCoordinates("45.8992 6.1294")).toEqual({ latitude: 45.8992, longitude: 6.1294 });
    expect(parseCoordinates("-33.86, 151.21")).toEqual({ latitude: -33.86, longitude: 151.21 });
  });

  it("reads them as exiftool prints them, west and ouest negative", () => {
    const point = parseCoordinates(`45° 53' 57.12" N, 6° 7' 45.84" E`);
    expect(point?.latitude).toBeCloseTo(45.8992, 4);
    expect(point?.longitude).toBeCloseTo(6.1294, 4);
    expect(parseCoordinates("48° 23′ 24″ N 4° 29′ 10″ O")?.longitude).toBeCloseTo(-4.486, 3);
  });

  it("says nothing of what is not two coordinates", () => {
    expect(parseCoordinates("Annecy")).toBeNull();
    expect(parseCoordinates("45.9")).toBeNull();
    expect(parseCoordinates("95, 6")).toBeNull();
  });
});

describe("distances", () => {
  it("measures along the Earth, and says it as a map would", () => {
    const paris = TOWNS.find((t) => t.name === "Paris");
    const marseille = TOWNS.find((t) => t.name === "Marseille");
    if (!paris || !marseille) throw new Error("towns");
    expect(distanceKm(paris, marseille)).toBeGreaterThan(655);
    expect(distanceKm(paris, marseille)).toBeLessThan(665);
    expect(distanceLabel(0.42)).toBe("420 m");
    expect(distanceLabel(3.25)).toBe("3,3 km");
    expect(distanceLabel(312.4)).toBe("312 km");
  });
});

describe("metadata", () => {
  it("shows the tags as exiftool does, the camera's own clock kept", async () => {
    expect(await readMetadata(bytes("osint/lac-de-montagne.jpg"))).toEqual([
      { label: "Fabricant", tag: "Make", value: "Apple" },
      { label: "Appareil", tag: "Camera Model Name", value: "iPhone 13" },
      { label: "Logiciel", tag: "Software", value: "17.5.1" },
      { label: "Prise de vue", tag: "Date/Time Original", value: "2026:07:14 16:42:08" },
      { label: "Latitude", tag: "GPS Latitude", value: `45° 53' 57.12" N` },
      { label: "Longitude", tag: "GPS Longitude", value: `6° 7' 45.84" E` },
      { label: "Altitude", tag: "GPS Altitude", value: "448 m" },
    ]);
  });

  it("reads a picture without metadata as no rows", () => {
    expect(metadataRows(undefined)).toEqual([]);
    expect(metadataRows({ Make: "\0", GPSLatitude: [1, 2] })).toEqual([]);
  });
});

describe("the PhotoOsint exercises of the lessons", () => {
  const exercises = readdirSync(LESSONS, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".mdx"))
    .flatMap((f) => {
      const mdx = readFileSync(path.join(LESSONS, f), "utf8").replace(/\r\n/gu, "\n");
      return (mdx.match(/<PhotoOsint\n[\s\S]*?\n\/>/gu) ?? []).map((tag) => ({ file: f, tag }));
    });

  it("are found", () => {
    expect(exercises.length).toBeGreaterThanOrEqual(2);
  });

  it.each(exercises)(
    "$file: its photo exists and was taken where the answer says",
    async ({ tag }) => {
      const prop = (name: string): unknown => {
        const line = tag.split("\n").find((l) => l.startsWith(`  ${name}=`));
        if (line === undefined) return undefined;
        const value = line.slice(name.length + 3);
        return value.startsWith('"') ? value.slice(1, -1) : JSON.parse(value.slice(1, -1));
      };
      const parsed = parsePhotoOsint({
        id: prop("id"),
        title: prop("title"),
        src: prop("src"),
        alt: prop("alt"),
        caption: prop("caption"),
        task: prop("task"),
        answer: prop("answer"),
        place: prop("place"),
        conclusion: prop("conclusion"),
        hints: prop("hints"),
      });
      if (!parsed.ok) throw new Error(parsed.problem);
      const gps: unknown = await exifr.gps(bytes(parsed.value.src.slice(1)));
      expect(gps).toMatchObject({
        latitude: expect.any(Number) as number,
        longitude: expect.any(Number) as number,
      });
      // SAFETY: checked just above to hold both numbers.
      const point = gps as { latitude: number; longitude: number };
      expect(distanceKm(point, parsed.value.answer)).toBeLessThanOrEqual(
        parsed.value.answer.radiusKm,
      );
      expect(RAW_EXIF_OPTIONS.reviveValues).toBe(false);
    },
  );
});
