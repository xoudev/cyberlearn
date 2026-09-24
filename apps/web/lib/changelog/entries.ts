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
    version: "2.8",
    date: "2026-09-19",
    title: "Le classement entre amis",
    changes: [
      {
        type: "new",
        text: "Un onglet Amis sur le classement, à côté de Global et Ligue. On y figure sous son nom ou on n'y figure pas : il n'y a pas de mode anonyme ici, parce que sur une liste de cinq amis « Anonyme » n'anonymise personne. C'est une case à cocher dans Confidentialité, éteinte au départ, et indépendante du classement public : tu peux être masqué sur l'un et visible sur l'autre.",
      },
      {
        type: "improved",
        text: "L'encadré du niveau, sur le tableau de bord, disait la même chose plusieurs fois. Il dit maintenant quatre choses : le rang atteint, le niveau, où tu en es dedans, et ce que coûte le suivant.",
      },
      {
        type: "fixed",
        text: "Le Dashboard est revenu en tête de la barre latérale. Les Révisions, qui peuvent être coupées, passaient devant lui quand elles étaient actives, donc seuls ceux qui les utilisent voyaient le problème.",
      },
      {
        type: "fixed",
        text: "Les liens que la console d'administration envoie par e-mail (appel d'un bannissement, réponse à une demande, invitation à une classe) ne peuvent plus pointer vers la console elle-même, où le destinataire n'a rien à faire.",
      },
    ],
  },
  {
    version: "2.7",
    date: "2026-09-18",
    title: "Des amis, et ce qu'ils donnent",
    changes: [
      {
        type: "new",
        text: "Un système d'amis : demande, acceptation, refus. Il vit dans un petit panneau de la barre du haut, à côté de la cloche, plutôt que sur une page à lui : voir ses amis et répondre à une demande sont des coups d'œil.",
      },
      {
        type: "new",
        text: "Une amitié donne des droits. Tu peux partager une note avec un ami, pas seulement avec ta classe, et ton profil privé s'ouvre aux personnes que tu as acceptées. C'est ce que « privé » veut dire partout ailleurs. Une demande en attente ne donne rien.",
      },
      {
        type: "new",
        text: "Le contenu signalé par la modération automatique est masqué immédiatement, puis relu par une personne : faux positif, il revient ; confirmé, il part définitivement. L'auteur est prévenu dans les deux cas, par e-mail et par notification.",
      },
      {
        type: "new",
        text: "Un bannissement a une durée, un motif obligatoire et un moyen d'être contesté. Le motif est repris tel quel dans l'e-mail et sur l'écran que la personne voit en se connectant.",
      },
      {
        type: "improved",
        text: "Les messages de confirmation s'affichent en haut au centre de l'écran, et non plus dans le coin le plus éloigné de ce qu'on vient de cliquer. Ils ont pris l'habillage du site au passage.",
      },
      {
        type: "improved",
        text: "Les menus déroulants s'ouvrent enfin aux couleurs du site. Un menu natif est dessiné par le système d'exploitation, donc impossible à habiller ; ils ont été refaits, en gardant les flèches, la touche Échap et la saisie au clavier qui saute à l'option commençant par ce qu'on tape.",
      },
      {
        type: "fixed",
        text: "Sur les deux pages Parcours, le contenu touchait les bords de l'écran à presque toutes les tailles de fenêtre. La marge est revenue.",
      },
    ],
  },
  {
    version: "2.6",
    date: "2026-09-17",
    title: "Les classes, le forum et la modération",
    changes: [
      {
        type: "new",
        text: "Les classes : un professeur suit un groupe d'élèves, leur donne du travail avec une date limite, et voit qui a rendu quoi. L'élève reçoit un e-mail quand du travail lui est assigné.",
      },
      {
        type: "new",
        text: "Un professeur peut écrire ses propres leçons et construire ses propres parcours, visibles uniquement par ses classes, avec le même éditeur que la console d'administration.",
      },
      {
        type: "new",
        text: "Un professeur peut distribuer un corrigé ou tout autre document à sa classe, et choisir le moment où il devient visible.",
      },
      {
        type: "new",
        text: "Un forum, pour poser une question à tout le monde plutôt qu'au seul professeur.",
      },
      {
        type: "new",
        text: "Une modération automatique lit tout ce qui est publié (questions, réponses, forum, notes partagées) avant que ça n'arrive à l'écran de quelqu'un d'autre.",
      },
      {
        type: "new",
        text: "Le partage de notes : une note écrite pour une leçon peut être remise aux gens de ta classe.",
      },
      {
        type: "new",
        text: "La recherche de la barre du haut cherche vraiment : parcours, leçons et tes propres notes, sans tenir compte des accents.",
      },
      {
        type: "new",
        text: "Une demande d'aide est devenue une conversation : l'équipe répond, tu réponds, le fil reste sur ta page. Et le bouton pour en ouvrir une se trouve, au lieu d'être en bas du pied de page.",
      },
      {
        type: "improved",
        text: "Le tableau de bord est réorganisé autour des parcours, et cesse de répéter trois fois la même information.",
      },
      {
        type: "improved",
        text: "Wrapped s'ouvre une fois par an, en décembre, et son export produit vraiment une image.",
      },
      {
        type: "improved",
        text: "Les révisions peuvent être coupées depuis les réglages : la fonctionnalité entière, pas seulement ses rappels. Les plannings existants sont conservés si tu la réactives.",
      },
      {
        type: "improved",
        text: "La couleur d'accent que tu équipes dans le casier atteint désormais toute l'application, et chaque cosmétique se dessine tel qu'il est plutôt qu'avec une vignette générique.",
      },
      {
        type: "improved",
        text: "Une leçon affiche qui l'a écrite, plutôt que qui l'a terminée le premier.",
      },
      {
        type: "improved",
        text: "L'application mobile a rattrapé le site, et ce qui lui reste dû est écrit noir sur blanc dans le dépôt.",
      },
      {
        type: "fixed",
        text: "Être connecté ne ramène plus à la page d'accueil publique.",
      },
    ],
  },
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
        text: "Les schémas des leçons s'affichent à leur taille, avec des libellés entiers. Ils étaient tantôt illisibles, tantôt rognés.",
      },
      {
        type: "fixed",
        text: "La dernière leçon d'un parcours peut être terminée : son bouton de validation manquait.",
      },
      {
        type: "fixed",
        text: "Sur le classement, le bloc « Ta position » ne se chevauche plus, et le pourcentage annoncé est juste : être premier affichait « Top 0 % ».",
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
