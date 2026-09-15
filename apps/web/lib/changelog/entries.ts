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
    version: "2.5",
    date: "2026-09-15",
    title: "Parcours suivis de bout en bout",
    changes: [
      {
        type: "new",
        text: "Terminer une leçon propose maintenant la suivante du même parcours, avec le nom du parcours et ta position dedans. Avant, elle proposait la prochaine leçon publiée dans tout le catalogue, sans rapport avec ce que tu suivais.",
      },
      {
        type: "new",
        text: "Les leçons d'un parcours se débloquent dans l'ordre : une leçon s'ouvre quand la précédente est terminée. Celles que tu as déjà validées restent accessibles, quel que soit l'ordre dans lequel tu les as faites.",
      },
      {
        type: "new",
        text: "Les parcours sont étiquetés Compétence ou Métier, et le catalogue se filtre sur les deux.",
      },
      {
        type: "new",
        text: "Dans le bloc-notes, les dossiers sont devenus de vrais dossiers : on y dépose une note en la glissant, et un double-clic les ouvre.",
      },
      {
        type: "improved",
        text: "Les terminaux des leçons listent enfin les commandes qu'ils acceptent : tape help pour les voir, Tab complète, et une faute de frappe propose la commande la plus proche.",
      },
      {
        type: "improved",
        text: "Le code à six chiffres de la double authentification se valide tout seul dès qu'il est complet.",
      },
      {
        type: "improved",
        text: "Connexion nettement plus rapide : la préparation de session téléchargeait une bibliothèque entière à chaque démarrage à froid.",
      },
      {
        type: "improved",
        text: "Réclamer une quête dit maintenant ce qu'elle fait, et une montée de niveau obtenue ainsi s'affiche au lieu de passer inaperçue.",
      },
      {
        type: "fixed",
        text: "Les schémas des leçons s'affichent à leur taille, avec des libellés entiers — ils étaient tantôt illisibles, tantôt rognés.",
      },
      {
        type: "fixed",
        text: "La dernière leçon d'un parcours peut être terminée : son bouton de validation manquait.",
      },
      {
        type: "fixed",
        text: "Sur le classement, le bloc « Ta position » ne se chevauche plus, et le pourcentage annoncé est juste — être premier affichait « Top 0 % ».",
      },
      {
        type: "fixed",
        text: "133 leçons se terminaient par une note de rédaction laissée par erreur. Elles sont retirées.",
      },
      {
        type: "fixed",
        text: "Une panne d'un service tiers ne peut plus rendre tout le site injoignable.",
      },
    ],
  },
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
