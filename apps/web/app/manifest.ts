import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cyber Learn",
    short_name: "Cyber Learn",
    description: "Apprentissage interactif en cybersécurité, développement et réseaux.",
    start_url: "/login",
    display: "standalone",
    background_color: "#030219",
    theme_color: "#030219",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/Logo_principal.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Logo_principal.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
