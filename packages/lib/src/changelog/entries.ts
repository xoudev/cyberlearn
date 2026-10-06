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
    version: "3.3",
    date: "2026-10-06",
    title: "Refonte des paramètres et profil portfolio",
    changes: [
      {
        type: "improved",
        text: "Sur le site, refonte des paramètres : ils s'ouvrent dans un volet par-dessus la page où tu es, depuis le rouage de la barre du haut ou depuis n'importe quel lien qui y mène (le classement, les révisions, ton profil, un avis de modération). Le volet s'ouvre aussitôt, passer d'une section à l'autre ne recharge rien, et ce que tu as commencé à remplir t'attend quand tu y reviens. Un lien reçu par e-mail ouvre le même volet sur ton tableau de bord.",
      },
      {
        type: "new",
        text: "Ton profil public devient un portfolio : tes compétences par catégorie, tes certificats avec un bouton « Vérifier » (et, sur ta propre page, « Ajouter à LinkedIn »), et les défis que tu as résolus. L'app montre les mêmes sections.",
      },
      {
        type: "new",
        text: "Une fiche de révision par module : les points « à retenir » de ses leçons réunis en une fiche, à télécharger en PDF depuis la page du parcours, ou à lire à l'écran dans l'app.",
      },
      {
        type: "new",
        text: "Un incident à choix : une histoire racontée scène par scène, où chaque décision a sa conséquence. Plusieurs fins à découvrir, et un bilan qui propose de rejouer.",
      },
      {
        type: "new",
        text: "Une commande s'explique mot par mot : dans les terminaux des leçons, un clic sur une étape de l'exercice ou sur une commande que tu viens de taper détaille la commande, chaque option, les tubes et les redirections. Dans l'app, d'un toucher.",
      },
      {
        type: "new",
        text: "Une enquête dans de vrais journaux : dans la leçon blue team sur l'analyse de logs, les journaux d'une nuit d'intrusion (auth.log et access.log) sont déposés dans la machine Linux, et c'est à toi de retrouver l'attaque, rien n'est joué d'avance.",
      },
      {
        type: "improved",
        text: "Les exercices Python peuvent importer pycryptodome, cryptography et pandas.",
      },
      {
        type: "improved",
        text: "Pour les professeurs : « Ma classe » compte les exercices réussis par chaque élève (le terminal Linux, les défis Python) à côté de ses leçons terminées. Chaque exercice réussi rapporte 10 XP la première fois.",
      },
    ],
  },
  {
    version: "3.2",
    date: "2026-10-05",
    title: "Refonte du tableau de bord et de la navigation",
    changes: [
      {
        type: "improved",
        text: "Sur le site, refonte du tableau de bord autour d'une seule question : que faire maintenant ? Une carte de mission montre la leçon en cours ou la prochaine du parcours, avec le module dessiné leçon par leçon. Dessous, les révisions du jour, les quêtes et la série de la semaine, puis tes chiffres et tes derniers badges. Le niveau est un anneau à côté du bonjour.",
      },
      {
        type: "improved",
        text: "Refonte de la navigation : la barre latérale se range en trois parties, Apprendre, Progression et Communauté, et ne compte que les révisions dues. Les nouveautés et les paramètres passent dans la barre du haut, à côté de la cloche, et les nouveautés portent un point tant qu'elles ne sont pas lues.",
      },
      {
        type: "improved",
        text: "Refonte des révisions : cinq par jour au plus, les leçons en retard depuis le plus longtemps d'abord. Une leçon retenue assez de fois sort du cycle, et une leçon archivée ne revient plus à réviser.",
      },
      {
        type: "improved",
        text: "La série se lit de la même façon sur le tableau de bord et sur ton profil, qui la prolonge de l'année : les jours actifs depuis janvier, le prochain palier et le calendrier des douze derniers mois. Et c'est « série » partout.",
      },
      {
        type: "improved",
        text: "Un site plus cohérent : les boutons, les cartes, les onglets, les filtres, les barres de progression et les fenêtres sont les mêmes d'une page à l'autre. Une fenêtre se ferme avec Échap ou d'un clic à côté, Tab reste dedans, et Échap ne ferme que celle du dessus. Les barres et les onglets se présentent correctement au lecteur d'écran.",
      },
      {
        type: "fixed",
        text: "Les mêmes mots et les mêmes couleurs pour les mêmes choses : « Réseau » partout, « Débutant » aussi sur les défis qui disaient « Facile », « Niv. 7 » pour un niveau, dans l'app aussi. Chaque catégorie garde sa couleur, la page des révisions comprise, et la carte de l'exercice OSINT suit l'accent que tu as équipé.",
      },
      {
        type: "fixed",
        text: "La note moyenne d'un parcours figure sur toutes ses cartes (en cours, certifié, à découvrir) et sur le catalogue public, plus seulement sur sa page.",
      },
      {
        type: "new",
        text: "Pour les professeurs, refonte de l'éditeur de leçons : la leçon s'écrit par blocs (titres, texte, et chaque composant avec un champ par réglage), les dix-sept exercices et labos ont leur formulaire, un champ que la page refuserait est signalé avant d'enregistrer, et l'aperçu est la vraie page, telle que tes élèves la verront. Le guide liste les vingt-huit composants avec des exemples prêts à insérer, et le code MDX reste à un clic.",
      },
    ],
  },
  {
    version: "3.1",
    date: "2026-10-05",
    title: "Des labos dans les leçons",
    changes: [
      {
        type: "new",
        text: "Une vraie base de données dans les leçons : SQLite tourne dans ton navigateur, tu écris tes requêtes et tu vois le résultat, ou l'erreur exacte. La leçon sur l'injection SQL en fait un labo : contourner une connexion, faire remonter les comptes, entrer dans celui de l'admin, en voyant à chaque essai la requête que reçoit la base.",
      },
      {
        type: "new",
        text: "Un vrai site PHP à attaquer puis à corriger, dans ton navigateur : tu lis le code d'une page, tu l'attaques (XSS, accès aux données d'un autre), puis tu la corriges, et ton correctif est rejoué sur des attaques que tu n'as pas envoyées.",
      },
      {
        type: "new",
        text: "Des ateliers réseau : câbler et adresser des PC, des switches et des routeurs puis les tester avec ping, des calculs de sous-réseaux tirés au hasard et corrigés avec le raisonnement, une trame décortiquée octet par octet où un clic nomme chaque champ, et un pare-feu à régler avec des paquets de test qui passent ou non.",
      },
      {
        type: "new",
        text: "Des outils d'enquête : une chasse dans les logs façon SIEM, filtrer et compter jusqu'à l'attaquant ; un éditeur hexadécimal pour lire un fichier à ses octets, réparer un en-tête et trouver un message caché ; l'OSINT sur photo, où les métadonnées sont lues dans ton navigateur et le lieu se place sur une carte.",
      },
      {
        type: "new",
        text: "Un atelier crypto : Base64, hexadécimal, César, Vigenère, XOR et SHA-256 sur un même établi, et des messages à déchiffrer.",
      },
      {
        type: "new",
        text: "Un bac à sable Git : un dépôt simulé, un terminal pour le piloter, et le graphe des branches redessiné à chaque commande.",
      },
      {
        type: "new",
        text: "Des animations que tu fais avancer pas à pas (la poignée de main TCP, le chiffrement symétrique, la pile d'appels), et des exercices pour remettre des étapes dans l'ordre ou associer des paires.",
      },
      {
        type: "improved",
        text: "Dans l'app aussi : le bac à sable Git, la trame octet par octet, l'atelier crypto et les exercices d'ordre et de paires.",
      },
    ],
  },
  {
    version: "3.0",
    date: "2026-10-03",
    title: "Le vrai terminal Linux et les défis CTF",
    changes: [
      {
        type: "new",
        text: "Un vrai Linux dans les leçons : la machine tourne dans ton navigateur, avec un vrai bash pour les scripts, et l'exercice vérifie ce que tu as réellement fait sur elle (fichiers, liens, permissions, comptes). Les exercices du parcours Linux s'y font désormais.",
      },
      {
        type: "new",
        text: "Le parcours Linux est complet : six nouveaux modules (processus et ressources, logiciels et paquets, scripts Bash, services et journaux, disques et sauvegardes, Linux en réseau), puis un projet de fin de parcours, le serveur d'un petit atelier, avec une épreuve pratique chronométrée et un examen final de 50 questions.",
      },
      {
        type: "new",
        text: "Les défis CTF : trois premiers défis joués sur une machine Linux (Le journal bavard, Le dossier caché, La sauvegarde oubliée), avec un flag propre à chaque élève et des indices payés en XP. Ils sont aussi dans l'app.",
      },
      {
        type: "new",
        text: "Deux exercices de sécurité, sur le site et dans l'app : « Trouve la faille », cliquer la ligne vulnérable d'un extrait de code puis nommer la faille, et « Boîte mail piégée », signaler dans un courriel ce qui trahit l'hameçonnage.",
      },
      {
        type: "new",
        text: "Un glossaire : 96 termes techniques soulignés dans les leçons, avec leur définition au survol, et une page Glossaire qui les liste tous.",
      },
      {
        type: "improved",
        text: "Un compte resté inactif deux ans est prévenu par e-mail avant d'être effacé, comme le promet la politique de confidentialité : une connexion ou le lien « Garder mon compte » suffit à le conserver.",
      },
      {
        type: "fixed",
        text: "Le code des bacs à sable garde son indentation, les étapes du terminal s'affichent une par ligne, et les bacs à sable et défis Python s'affichent dans l'app.",
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
