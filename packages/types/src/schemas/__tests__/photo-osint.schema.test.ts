import { describe, expect, it } from "vitest";
import { parsePhotoOsint } from "../photo-osint.schema.js";

const PHOTO = {
  id: "p",
  src: "/osint/lac-de-montagne.jpg",
  alt: "Un lac.",
  task: "Trouve le lieu.",
  answer: { latitude: 45.8992, longitude: 6.1294 },
  place: "Annecy",
};

describe("parsePhotoOsint", () => {
  it("accepts an exercise, the radius at 20 km unless said", () => {
    const parsed = parsePhotoOsint(PHOTO);
    expect(parsed.ok && parsed.value.answer.radiusKm).toBe(20);
    expect(
      parsePhotoOsint({ ...PHOTO, answer: { ...PHOTO.answer, radiusKm: 5 }, hints: ["x"] }).ok,
    ).toBe(true);
  });

  it("takes only a picture shipped with the site, and says so", () => {
    expect(parsePhotoOsint({ ...PHOTO, src: "https://example.org/a.jpg" })).toEqual({
      ok: false,
      problem: "src : la photo est un .jpg de public/osint (/osint/nom.jpg).",
    });
    expect(parsePhotoOsint({ ...PHOTO, src: "/osint/../avatars/x.jpg" }).ok).toBe(false);
  });

  it("refuses a place off the globe, or an exercise without its answer", () => {
    expect(parsePhotoOsint({ ...PHOTO, answer: { latitude: 91, longitude: 0 } }).ok).toBe(false);
    const noAnswer = {
      id: "p",
      src: PHOTO.src,
      alt: PHOTO.alt,
      task: PHOTO.task,
      place: PHOTO.place,
    };
    expect(parsePhotoOsint(noAnswer).ok).toBe(false);
  });
});
