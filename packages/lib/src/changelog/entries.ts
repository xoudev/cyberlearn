/**
 * Release notes, shown on the site's /changelog and the app's Nouveautés.
 * Newest entry first. Add a new object at the top of CHANGELOG for each
 * release; the "new" dot (the site's sidebar, the app's profile hub) and the
 * per-device "seen" state key off CHANGELOG[0].version, so bumping the version
 * is all that's needed to surface a fresh entry, on both.
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
    version: "3.23",
    date: "2026-10-05",
    title: "La même palette dans les labos",
    changes: [
      {
        type: "fixed",
        text: "Les exercices et labos de leçon, l'éditeur de leçon, la recherche et le certificat lisent la même palette. La carte de l'exercice OSINT suit désormais l'accent que tu as équipé, au lieu de rester turquoise.",
      },
    ],
  },
  {
    version: "3.22",
    date: "2026-10-05",
    title: "Le même bouton jusque dans les labos",
    changes: [
      {
        type: "improved",
        text: "Les boutons écrits à la main dans les pages (l'accueil, le test de positionnement, les notes, les paramètres, les défis) et ceux des labos de leçon rejoignent la famille unique : même hauteur, mêmes capitales, même réaction au survol.",
      },
    ],
  },
  {
    version: "3.21",
    date: "2026-10-05",
    title: "Un seul bouton",
    changes: [
      {
        type: "improved",
        text: "Les boutons du tableau de bord, des classes, des amis, des défis, du forum, du guide, de l'examen et du catalogue des parcours étaient dix familles de boutons. Ils sont la même : même hauteur, même capitale, même réaction au survol et au clavier, dans le ton de ce qu'ils font.",
      },
    ],
  },
  {
    version: "3.20",
    date: "2026-10-05",
    title: "La même carte partout",
    changes: [
      {
        type: "improved",
        text: "Les cadres du site (un bloc, une tuile, un panneau) avaient dix fonds et deux bordures, posés à la main à chaque fois. Ils en ont trois : la carte, la carte enfoncée, le cadre seul.",
      },
    ],
  },
  {
    version: "3.19",
    date: "2026-10-05",
    title: "Les petits libellés, à la même taille",
    changes: [
      {
        type: "improved",
        text: "Les petits libellés en capitales (un surtitre, une méta, une étiquette) avaient vingt-cinq tailles et espacements différents d'une page à l'autre. Ils en ont trois, les mêmes partout.",
      },
    ],
  },
  {
    version: "3.18",
    date: "2026-10-05",
    title: "Les mêmes coins, les mêmes cadres",
    changes: [
      {
        type: "fixed",
        text: "Les crochets d'angle, le titre au mot dégradé, l'en-tête de section « // » et la carte sont dessinés une fois pour tout le site ; la page introuvable et la page des comptes suspendus partagent le même cadre. Et plus rien ne peut s'arrondir par mégarde : le rayon des composants est à zéro à la source.",
      },
    ],
  },
  {
    version: "3.17",
    date: "2026-10-05",
    title: "Les mêmes onglets, les mêmes filtres",
    changes: [
      {
        type: "improved",
        text: "Les onglets (profil, casier, classement, classe) et les pastilles de filtre (parcours, défis, badges) sont les mêmes d'une page à l'autre, et se présentent au lecteur d'écran comme des onglets et des filtres. Les pastilles s'allument dans la couleur de ce qu'elles filtrent : une catégorie, une rareté.",
      },
    ],
  },
  {
    version: "3.16",
    date: "2026-10-05",
    title: "Une seule barre de progression",
    changes: [
      {
        type: "improved",
        text: "Les barres de progression du site (parcours, badges, quêtes, classe, examen, casier, défis) sont la même barre : même piste, même remplissage, même pointe. Et chacune dit désormais au lecteur d'écran ce qu'elle mesure, ce que trois seulement faisaient.",
      },
    ],
  },
  {
    version: "3.15",
    date: "2026-10-05",
    title: "Les mêmes mots pour les mêmes choses",
    changes: [
      {
        type: "fixed",
        text: "Une catégorie et une difficulté s'écrivent désormais pareil d'une page à l'autre, et dans l'app : « Réseau » plutôt que « Réseaux » ici et « RÉSEAU » là, « Débutant » sur les défis aussi, où il s'appelait « Facile ». La couleur de chaque catégorie est la même partout : la page des révisions peignait Cybersec en rose et Dev en turquoise, à l'inverse du reste du site.",
      },
    ],
  },
  {
    version: "3.14",
    date: "2026-10-05",
    title: "Une seule fenêtre pour tout le site",
    changes: [
      {
        type: "improved",
        text: "Les dix fenêtres qui s'ouvrent par-dessus une page (la fin d'une leçon, le niveau franchi, le recadrage de l'avatar, une note et son partage, la suppression du compte, l'avis de bannissement, le récap) sont la même fenêtre : même fond, même cadre, Échap et un clic à côté pour la fermer, et Tab qui reste dedans au lieu de filer dans la page derrière. Quand une fenêtre s'ouvre par-dessus une autre, Échap ne ferme que celle du dessus.",
      },
    ],
  },
  {
    version: "3.13",
    date: "2026-10-05",
    title: "Un avatar, un niveau, une rareté : les mêmes partout",
    changes: [
      {
        type: "improved",
        text: "Ton avatar est dessiné par le même composant dans la barre du haut, sur ton profil, sur ton profil public et sous une leçon que tu as écrite. Un niveau s'écrit « Niv. 7 » partout, dans l'app aussi, au lieu de trois graphies. La barre d'XP du profil public est celle du profil, et les badges du profil sont les cartes de la page des badges.",
      },
    ],
  },
  {
    version: "3.12",
    date: "2026-10-05",
    title: "Les mêmes briques d'une page à l'autre",
    changes: [
      {
        type: "improved",
        text: "Le fil d'Ariane, l'encart « rien à afficher », les tuiles de chiffres et le bouton « copier » sont désormais les mêmes sur toutes les pages, au pixel près : ils étaient dessinés jusqu'à dix-sept fois chacun, chaque fois un peu autrement. Le classement nomme les rangs comme le tableau de bord.",
      },
    ],
  },
  {
    version: "3.11",
    date: "2026-10-05",
    title: "Les paramètres s'ouvrent en volet",
    changes: [
      {
        type: "new",
        text: "Le rouage de la barre du haut ouvre désormais les paramètres dans un volet, par-dessus la page où tu étais : les sept sections d'un côté, leurs réglages de l'autre, et Échap pour revenir. Les mêmes réglages qu'avant, sans quitter ce que tu faisais. La page complète reste là pour un lien direct ou un rechargement.",
      },
    ],
  },
  {
    version: "3.10",
    date: "2026-10-05",
    title: "Une seule palette pour tout le site",
    changes: [
      {
        type: "fixed",
        text: "La page introuvable, la page des comptes suspendus, le catalogue public et le forum lisaient des couleurs qui n'avaient jamais été définies pour eux. Tout le site parle désormais la même palette, définie une fois, les quatre pages qui en gardaient chacune une copie comprises. Les crochets d'angle des cartes et les boutons des panneaux de la barre du haut sont dessinés une seule fois.",
      },
    ],
  },
  {
    version: "3.9",
    date: "2026-10-05",
    title: "Les révisions reprennent une taille humaine",
    changes: [
      {
        type: "improved",
        text: "Chaque jour demande désormais cinq révisions au plus, les leçons en retard depuis le plus longtemps d'abord ; les autres attendent leur tour sans être comptées. Une leçon retenue assez de fois sort du cycle au lieu de revenir pour toujours. Et une leçon archivée ne revient plus à réviser.",
      },
    ],
  },
  {
    version: "3.8",
    date: "2026-10-05",
    title: "La série se lit de la même façon partout",
    changes: [
      {
        type: "improved",
        text: "La carte de la série du profil est désormais celle du tableau de bord, prolongée de l'année : les jours actifs depuis janvier, le prochain palier et le calendrier des douze derniers mois, dans les mêmes couleurs et avec les mêmes mots. Et c'est « série » partout, plus « streak » ici et « série » là.",
      },
    ],
  },
  {
    version: "3.7",
    date: "2026-10-05",
    title: "La note des parcours sur leurs cartes",
    changes: [
      {
        type: "fixed",
        text: "La note moyenne d'un parcours ne s'affichait que sur sa page et sur les cartes des parcours pas encore commencés. Elle figure désormais sur toutes ses cartes, en cours, certifié ou à découvrir, et sur le catalogue public.",
      },
    ],
  },
  {
    version: "3.6",
    date: "2026-10-05",
    title: "Les nouveautés et les paramètres passent dans la barre du haut",
    changes: [
      {
        type: "improved",
        text: "Les petits liens sous ton nom, en bas de la barre latérale, ont disparu. Les nouveautés sont un bouton de la barre du haut, à côté des amis, marqué d'un point tant qu'elles ne sont pas lues. Les paramètres s'ouvrent depuis l'icône de rouage, à côté de la cloche. Dans la barre latérale, le casier a rejoint les badges et les certificats, l'aide a rejoint le forum, et le nom du site n'est plus écrit deux fois.",
      },
    ],
  },
  {
    version: "3.5",
    date: "2026-10-05",
    title: "L'aperçu de l'éditeur s'affiche dans la console",
    changes: [
      {
        type: "fixed",
        text: "Dans la console, le volet « Aperçu du site » de l'éditeur de leçons restait sur un refus du navigateur : le site n'autorisait pas la console à l'encadrer. Il la reconnaît désormais à son adresse déployée, et l'aperçu s'affiche.",
      },
    ],
  },
  {
    version: "3.4",
    date: "2026-10-05",
    title: "Les exercices et les labos se remplissent en champs",
    changes: [
      {
        type: "new",
        text: "Dans l'éditeur de leçons, les dix-sept exercices et labos ont désormais leur formulaire comme les autres composants : le code et la ligne fautive d'un « trouve la faille », les paragraphes et les indices d'un courriel piégé, les sondes d'un pare-feu, les vérifications d'un bac à sable Git, les événements et les questions d'une chasse dans les logs, le lieu d'une photo, les octets à réparer… Chaque bloc est vérifié avec les règles de la page elle-même, et dit sous le champ ce qui n'irait pas.",
      },
    ],
  },
  {
    version: "3.3",
    date: "2026-10-05",
    title: "Une leçon s'écrit par blocs",
    changes: [
      {
        type: "new",
        text: "L'éditeur de leçons, dans la console comme dans la classe d'un professeur, s'ouvre désormais en blocs : des titres, des passages de texte et des composants avec un champ pour chaque chose, le ton d'un encadré, les options d'un quiz et la bonne réponse à cocher, le code de départ d'un bac à sable, les fichiers et les vérifications d'un terminal Linux. Un « + » entre deux blocs en ajoute un depuis le guide, les flèches le déplacent, et un champ que la page refuserait est signalé avant d'enregistrer. Le code MDX reste à un clic, et c'est la même leçon.",
      },
    ],
  },
  {
    version: "3.2",
    date: "2026-10-05",
    title: "L'éditeur de leçons montre la vraie page",
    changes: [
      {
        type: "new",
        text: "L'aperçu de l'éditeur de leçons est désormais rendu par le site lui-même, avec les composants des leçons : quiz, bac à sable, terminaux, labos, tout s'affiche comme les apprenants le verront. Il se met à jour après chaque pause de frappe, ou d'un clic, et garde l'endroit où on en était. Un brouillon qui ne s'affiche pas est signalé avec la section et la ligne en cause, avant d'enregistrer. L'ancien aperçu rapide reste à un clic.",
      },
    ],
  },
  {
    version: "3.1",
    date: "2026-10-05",
    title: "Le guide de l'éditeur de leçons connaît tous les composants",
    changes: [
      {
        type: "improved",
        text: "Dans l'éditeur de leçons, de la console comme de la classe d'un professeur, le panneau Guide liste désormais les vingt-huit composants d'une leçon, par famille, chacun avec ce qu'il fait, un ou plusieurs exemples prêts à insérer et un lien vers sa section du guide de rédaction. Une recherche filtre par nom, scénario ou langage. L'aperçu nomme chaque composant au lieu d'afficher une balise.",
      },
    ],
  },
  {
    version: "3.0",
    date: "2026-10-05",
    title: "Un tableau de bord qui répond à une question",
    changes: [
      {
        type: "improved",
        text: "Le tableau de bord du site a été redessiné autour d'une seule question : que faire maintenant ? Une carte de mission montre la leçon en cours ou la prochaine du parcours, avec le module en cours dessiné leçon par leçon. Dessous, les révisions du jour, les quêtes et la série de la semaine, puis une ligne de chiffres et les derniers badges. Le niveau est un anneau à côté du bonjour.",
      },
      {
        type: "improved",
        text: "La barre latérale est regroupée en trois parties, Apprendre, Progression et Communauté, avec un bloc compte en bas : avatar, niveau, casier, nouveautés, aide et paramètres. Seules les révisions dues y sont comptées.",
      },
    ],
  },
  {
    version: "2.9",
    date: "2026-09-27",
    title: "Le clic droit dans le bloc-notes",
    changes: [
      {
        type: "new",
        text: "Un clic droit sur une note ouvre un menu : la modifier, la partager, la ranger dans un dossier, copier son texte, l'exporter ou la supprimer, sans l'ouvrir d'abord. Sur un dossier, le menu le renomme, change sa couleur ou son icône et exporte ce qu'il contient. Le menu se pilote aussi au clavier (touche Menu ou Maj+F10, puis les flèches). Maj+clic droit rend le menu du navigateur.",
      },
    ],
  },
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

/** Storage key (localStorage, AsyncStorage) holding the last version the reader has seen. */
export const CHANGELOG_SEEN_KEY = "cl-changelog-seen";

/** Whether the newest release has not been read yet on this device. */
export function hasUnseenChangelog(seenVersion: string | null): boolean {
  return LATEST_VERSION !== "" && seenVersion !== LATEST_VERSION;
}

/** "19 septembre 2026", from an entry's ISO date. */
export function formatChangelogDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
