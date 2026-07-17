/**
 * Release notes shown on /changelog. Newest entry first. Add a new object at
 * the top of CHANGELOG for each release; the sidebar "new" dot and the
 * per-user "seen" state key off CHANGELOG[0].version, so bumping the version
 * is all that's needed to surface a fresh entry to users.
 */

export type ChangeType = "new" | "improved" | "fixed";

export interface ChangelogChange {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  /** Semantic-ish version, e.g. "2.4". Must be unique. */
  version: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  changes: ChangelogChange[];
}

export const CHANGE_META: Record<ChangeType, { label: string; color: string; bg: string }> = {
  new: { label: "Nouveau", color: "#0AFFD4", bg: "rgba(10,255,212,0.08)" },
  improved: { label: "Amélioration", color: "#6E8BFF", bg: "rgba(0,36,255,0.10)" },
  fixed: { label: "Correctif", color: "#FFB020", bg: "rgba(255,176,32,0.08)" },
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.4",
    date: "2026-07-17",
    title: "Bienvenue en vidéo & notes de version",
    changes: [
      {
        type: "new",
        text: "Une courte vidéo de bienvenue t'accueille à ta première visite du tableau de bord.",
      },
      {
        type: "new",
        text: "Cette page de notes de version : suis tout ce qui change sur CyberLearn.",
      },
      { type: "new", text: "Une démo du produit est accessible depuis la page d'accueil." },
    ],
  },
  {
    version: "2.3",
    date: "2026-07-12",
    title: "Console d'administration repensée",
    changes: [
      {
        type: "improved",
        text: "Interface d'administration entièrement refaite, plus rapide et responsive.",
      },
      {
        type: "new",
        text: "Chaque signalement peut désormais être ouvert pour lire le message complet.",
      },
      { type: "new", text: "Un bouton « Signaler le problème » apparaît sur les écrans d'erreur." },
      {
        type: "fixed",
        text: "Correction d'un plantage à la connexion à l'espace d'administration.",
      },
    ],
  },
  {
    version: "2.2",
    date: "2026-07-05",
    title: "Double authentification & paramètres",
    changes: [
      { type: "new", text: "Active la double authentification (2FA) depuis tes paramètres." },
      { type: "fixed", text: "Le QR code d'activation 2FA se scanne à nouveau correctement." },
      {
        type: "improved",
        text: "Accès rapide aux paramètres via l'icône dédiée dans la barre latérale.",
      },
    ],
  },
  {
    version: "2.1",
    date: "2026-06-28",
    title: "Réinitialisation du mot de passe & application mobile",
    changes: [
      { type: "fixed", text: "La réinitialisation du mot de passe fonctionne de bout en bout." },
      { type: "improved", text: "Nouvelle page de présentation de l'application mobile." },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0]?.version ?? "";

/** localStorage key holding the last changelog version the user has read. */
export const CHANGELOG_SEEN_KEY = "cl-changelog-seen";
