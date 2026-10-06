"use client";

import { ACCENT } from "@cyberlearn/ui";
import "leaflet/dist/leaflet.css";
import "./photo-osint.css";
import React, { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { type Point, TOWNS } from "@/lib/osint/geo";

/**
 * The map of <PhotoOsint>: Leaflet without any tile layer, so nothing leaves
 * the site. The land is the Natural Earth outlines of public/maps (France and
 * its neighbours), the sea is the container's background, and the towns are
 * named on it. A click places the learner's point. Client-side because Leaflet
 * draws in the page's DOM; it is loaded when the map mounts, not before.
 */

const POINT = "#FFB020";
/** Metropolitan France, Corsica included. */
const FRANCE: Leaflet.LatLngBoundsExpression = [
  [41.3, -5.2],
  [51.1, 9.6],
];
/** How close the map must be for the smaller towns to be named. */
const TOWN_ZOOM = 7;

/** What each country of the map file carries: its ISO code and French name. */
interface LandProperties {
  code: string;
  name: string;
}

interface OsintMapProps {
  readonly guess: Point | null;
  /** The place of the photo, shown once it is found. */
  readonly truth: Point | null;
  readonly onPick: (point: Point) => void;
}

export function OsintMap({ guess, truth, onPick }: OsintMapProps): React.ReactElement {
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const guessMark = useRef<Leaflet.CircleMarker | null>(null);
  const truthMark = useRef<Leaflet.CircleMarker | null>(null);
  const pick = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    // An object, not a let: the unmount flips it while the loading awaits.
    const life = { over: false };
    let created: Leaflet.Map | null = null;
    void (async () => {
      try {
        const L = await import("leaflet");
        const response = await fetch("/maps/france-voisins.geojson");
        if (!response.ok) throw new Error(`map ${String(response.status)}`);
        // SAFETY: the file is ours (public/maps, built by scripts/build-lesson-map.mjs).
        const land = (await response.json()) as GeoJSON.FeatureCollection<
          GeoJSON.MultiPolygon,
          LandProperties
        >;
        const el = box.current;
        if (life.over || el === null) return;
        created = L.map(el, {
          minZoom: 4,
          maxZoom: 12,
          maxBounds: [
            [33, -16],
            [58, 20],
          ],
          zoomSnap: 0.5,
        });
        // The view first: a vector layer added to a map without one has no
        // bounds to clip against, and Leaflet throws.
        created.fitBounds(FRANCE);
        created.attributionControl.setPrefix(false);
        created.attributionControl.addAttribution("Contours : Natural Earth");
        L.geoJSON<LandProperties>(land, {
          interactive: false,
          style: (feature) => {
            const france = feature?.properties.code === "FRA";
            return {
              color: france ? ACCENT : "#3A3670",
              weight: france ? 1.5 : 1,
              fillColor: france ? "#16123F" : "#0E0B2E",
              fillOpacity: 1,
            };
          },
        }).addTo(created);
        for (const town of TOWNS) {
          L.circleMarker([town.latitude, town.longitude], {
            radius: town.rank === 1 ? 3 : 2,
            color: "#B8B5D1",
            weight: 1,
            fillColor: "#B8B5D1",
            fillOpacity: 1,
            interactive: false,
          })
            .bindTooltip(town.name, {
              permanent: true,
              direction: "right",
              offset: [4, 0],
              className: town.rank === 1 ? "osint-town" : "osint-town osint-town-minor",
            })
            .addTo(created);
        }
        const shown = created;
        const showTowns = (): void => {
          el.classList.toggle("osint-close", shown.getZoom() >= TOWN_ZOOM);
        };
        created.on("zoomend", showTowns);
        created.on("click", (event: Leaflet.LeafletMouseEvent) => {
          pick.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
        });
        showTowns();
        lib.current = L;
        map.current = created;
        setReady(true);
      } catch (error) {
        // A client component: the console is where this failure can be read.
        console.error("La carte de l'exercice OSINT n'a pas pu se charger :", error);
        if (!life.over) setFailed(true);
      }
    })();
    return () => {
      life.over = true;
      created?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const L = lib.current;
    const m = map.current;
    if (!ready || L === null || m === null) return;
    guessMark.current?.remove();
    guessMark.current =
      guess === null
        ? null
        : L.circleMarker([guess.latitude, guess.longitude], {
            radius: 8,
            color: POINT,
            weight: 3,
            fillColor: POINT,
            fillOpacity: 0.35,
            interactive: false,
          })
            .bindTooltip("Ton point", { direction: "top", offset: [0, -8] })
            .addTo(m);
  }, [guess, ready]);

  useEffect(() => {
    const L = lib.current;
    const m = map.current;
    if (!ready || L === null || m === null) return;
    truthMark.current?.remove();
    truthMark.current = null;
    if (truth === null) return;
    truthMark.current = L.circleMarker([truth.latitude, truth.longitude], {
      radius: 9,
      color: ACCENT,
      weight: 3,
      fillColor: ACCENT,
      fillOpacity: 0.5,
      interactive: false,
    })
      .bindTooltip("Lieu de la photo", { permanent: true, direction: "top", offset: [0, -9] })
      .addTo(m);
    m.flyTo([truth.latitude, truth.longitude], Math.max(m.getZoom(), 8), { duration: 0.8 });
  }, [truth, ready]);

  if (failed) {
    return (
      <p style={{ margin: 0, color: "#B8B5D1", fontSize: 13 }}>
        La carte n&apos;a pas pu se charger : place ton point par ses coordonnées, ci-dessous.
      </p>
    );
  }
  return (
    <div
      ref={box}
      className="osint-map"
      role="application"
      aria-label="Carte de France : clique pour y placer ton point, ou donne ses coordonnées ci-dessous."
      style={{ height: 380, width: "100%" }}
    />
  );
}
