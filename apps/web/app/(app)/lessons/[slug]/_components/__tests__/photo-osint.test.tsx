// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoOsint } from "../photo-osint";

/**
 * The exercise as a learner plays it when the map cannot draw (no Leaflet in
 * jsdom): the metadata read from the real file's bytes, the point given by
 * its coordinates, the verdict by distance, the hints after two misses.
 */

const PUBLIC = path.resolve(__dirname, "../../../../../../public");

const PROPS = {
  id: "p",
  title: "Avant de publier",
  src: "/osint/lac-de-montagne.jpg",
  alt: "Un lac bordé de montagnes.",
  task: "Lis les métadonnées, puis place le lieu.",
  answer: { latitude: 45.8992, longitude: 6.1294, radiusKm: 15 },
  place: "Annecy, au bord du lac",
  conclusion: "N'importe qui sait où tu étais.",
  hints: ["45° 53′ 57″ N se convertit en 45,90.", "6° 7′ 46″ E donne 6,13."],
};

/** The site's static files, served from disk; the map file is missing on purpose. */
function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/osint/")) {
    const file = readFileSync(path.join(PUBLIC, url));
    return Promise.resolve(new Response(file, { status: 200 }));
  }
  return Promise.resolve(new Response(null, { status: 404 }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function place(coordinates: string): void {
  const input = screen.getByLabelText("Coordonnées du point");
  fireEvent.change(input, { target: { value: coordinates } });
  fireEvent.submit(input.closest("form") ?? input);
}

describe("PhotoOsint", () => {
  it("reads the metadata from the file itself, as exiftool shows it", async () => {
    render(<PhotoOsint {...PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: "Lire les métadonnées (EXIF)" }));
    expect(await screen.findByText("iPhone 13")).toBeTruthy();
    expect(screen.getByText("2026:07:14 16:42:08")).toBeTruthy();
    expect(screen.getByText(`45° 53' 57.12" N`)).toBeTruthy();
    expect(screen.getByText("448 m")).toBeTruthy();
  });

  it("falls back to typed coordinates when the map cannot draw", async () => {
    render(<PhotoOsint {...PROPS} />);
    expect(
      await screen.findByText(
        "La carte n'a pas pu se charger : place ton point par ses coordonnées, ci-dessous.",
      ),
    ).toBeTruthy();
  });

  it("says how far a wrong point is, gives the hints after two misses, then finds the place", async () => {
    render(<PhotoOsint {...PROPS} />);
    place("43.30, 5.37");
    fireEvent.click(screen.getByRole("button", { name: "Valider ce lieu" }));
    expect(
      screen.getByText(/^Pas là : ton point est à 29\d km du lieu de prise de vue\.$/u),
    ).toBeTruthy();
    expect(screen.queryByText(PROPS.hints[0] ?? "")).toBeNull();
    place("48.86, 2.35");
    fireEvent.click(screen.getByRole("button", { name: "Valider ce lieu" }));
    expect(screen.getByText(PROPS.hints[0] ?? "")).toBeTruthy();
    place(`45° 53' 57.12" N, 6° 7' 45.84" E`);
    fireEvent.click(screen.getByRole("button", { name: "Valider ce lieu" }));
    expect(
      screen.getByText(
        "✓ Trouvé : Annecy, au bord du lac. Ton point est à 10 m du lieu de prise de vue.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("N'importe qui sait où tu étais.")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Coordonnées du point").disabled).toBe(true);
    expect(
      await screen.findByRole("button", { name: "Nettoyer la photo, puis relire ses métadonnées" }),
    ).toBeTruthy();
  });

  it("refuses coordinates it cannot read, without placing anything", () => {
    render(<PhotoOsint {...PROPS} />);
    place("Annecy");
    expect(screen.getByText(/Coordonnées illisibles/u)).toBeTruthy();
    expect(screen.getByText("Pas encore de point : clique sur la carte.")).toBeTruthy();
  });

  it("says what is wrong with an exercise rather than breaking the lesson", () => {
    render(<PhotoOsint {...PROPS} src="https://example.org/photo.jpg" />);
    expect(screen.getByRole("note").textContent).toContain("Exercice OSINT indisponible : src");
  });
});
