import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CyberLearn",
    short_name: "CyberLearn",
    description: "Apprentissage interactif en cybersécurité, développement et réseaux.",
    start_url: "/login",
    display: "standalone",
    background_color: "#0B0C0E",
    theme_color: "#0B0C0E",
    orientation: "portrait-primary",
    // Real declared sizes rather than "any": a launcher that has to guess picks
    // badly, and the same tight logo was previously served as both the standard
    // and the maskable icon, so any launcher cropping to a circle ate into the
    // mark. These two are composited on the chalk background with an 18%
    // safe zone, which is what "maskable" is asking for.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
