/**
 * Release notes, shown in the site's Nouveautés drawer (opened over the
 * current page by the navbar button, `?news=1`; /changelog redirects there)
 * and on the app's Nouveautés screen. Newest entry first. Add a new object at
 * the top of CHANGELOG for each release; the "new" mark (the dot on the site's
 * navbar button, the "nouveau" label in the app's profile hub) and the
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
    version: "3.6",
    date: "2026-10-18",
    title: "Rappel du jour, amis et signalements",
    changes: [
      {
        type: "new",
        text: "Les révisions deviennent le « Rappel du jour » : chaque jour, six questions au plus, tirées des quiz de tes leçons terminées, pour deux minutes. Chaque réponse est corrigée aussitôt, avec la bonne réponse, l'explication et « Revoir ce passage », qui rouvre la leçon sur la section de la question. Une question ratée dans une leçon revient le lendemain, la dernière réussie une semaine plus tard ; chaque bonne réponse l'éloigne (3, 7 puis 21 jours) jusqu'à la retirer, et une erreur la ramène au lendemain. Le rappel rendu rapporte 15 XP, une fois par jour, et compte pour ta série. Il s'ouvre dans une fenêtre depuis « Révisions », la carte du tableau de bord ou sa notification, et plus aucun compteur ne grossit pendant ton absence : la carte dit seulement « à faire », « fait aujourd'hui » ou « rien aujourd'hui ». Dans l'app aussi.",
      },
      {
        type: "new",
        text: "« Réviser ce module · 2 min », dans l'en-tête de chaque module d'un parcours dont tu as terminé une leçon : six questions au plus sur ses leçons faites, corrigées une à une avec leur explication et « Revoir ce passage ». Une révision libre, quand tu veux, sans XP et sans toucher à ton rappel du jour. Dans l'app aussi.",
      },
      {
        type: "improved",
        text: "Le rappel du jour remplace l'ancienne file de révisions, où tu notais toi-même chaque leçon terminée (Oublié, Difficile, Facile) : elle est retirée du site et de l'app. Ce qui t'y attendait est converti en questions du rappel du jour, sans repartir de zéro : rien ne revient plus tôt que prévu, et ce qui était déjà en retard arrive sur cinq jours plutôt que d'un coup. Les anciens liens vers les révisions ouvrent le rappel du jour ; une version plus ancienne de l'app montre une file vide, mets-la à jour pour le retrouver.",
      },
      {
        type: "new",
        text: "Le panneau des amis, dans la barre du haut, met « Défier » à côté de chacun de tes amis : le défi s'ouvre avec lui déjà choisi, et le bouton devient « Duel en cours » tant qu'un duel vous occupe. « Ouvrir un profil » retrouve quelqu'un par son @pseudo, et tes listes s'affichent en entier, sans plus s'arrêter à soixante amis. « Ajouter » envoie une demande depuis une ligne publique du classement ou depuis la liste de ta classe, et une demande reçue s'accepte ou se refuse directement depuis sa notification. Dans l'app aussi, sauf la liste de ta classe, que l'app n'affiche pas encore.",
      },
      {
        type: "new",
        text: "« Tes amis » sur le tableau de bord : leurs derniers moments, une ligne chacun (une leçon terminée, un badge, un certificat, un défi résolu, un duel gagné), avec « Défier ». Les cartes de duel et l'écran d'un duel montrent l'avatar des deux joueurs, et le nom de l'autre mène à son profil. Dans l'app aussi, sur l'accueil ; la marque « Ami » y gagne aussi le forum, les questions-réponses des leçons, les solutions des défis et les tournois.",
      },
      {
        type: "improved",
        text: "La barre latérale se range en cinq groupes : le tableau de bord, Apprendre (parcours, leçons, révisions, bloc-notes, glossaire), S'entraîner (défis, duels), Progression (ton profil, classement, casier) et Communauté (forum, classes, aide). Duels affiche le nombre d'invitations qui attendent ta réponse. Le tableau de bord montre, seulement quand il y en a, les défis reçus d'un ami, à accepter ou refuser sur place, et les tournois en cours, avec « Entrer ». Dans l'app, le hub du profil suit les mêmes groupes et les mêmes noms, avec les invitations à côté de Duels, et l'accueil gagne « À toi de jouer ».",
      },
      {
        type: "new",
        text: "« Signaler », sous ce que d'autres ont publié : un message du forum, une question ou une réponse sous une leçon, une solution de défi, une ressource de ta classe. Tu choisis une raison et tu peux ajouter un mot pour l'équipe ; l'auteur ne saura pas qui l'a signalé, et rien n'est retiré avant que l'équipe l'ait relu. Si elle masque ou supprime un de tes contenus, un avis de modération te le dit, et une solution masquée ne peut plus qu'être retirée. Dans l'app aussi, sauf les ressources de classe, que l'app n'affiche pas encore.",
      },
      {
        type: "new",
        text: "Toutes tes notifications, et plus seulement les vingt dernières : « Tout voir », au bas du panneau de la cloche, ouvre leur historique, trente par page avec « Charger plus », toutes ou seulement les non lues, et « Tout marquer comme lu ». Ce que tu y marques lu l'est aussi dans la cloche, sans recharger la page. Dans l'app, la boîte de réception ne s'arrête plus à cinquante : « Charger plus » remonte le reste.",
      },
      {
        type: "new",
        text: "Pendant un tournoi, un flag disqualifié par l'équipe te le dit sur la page du défi, avec son motif : il ne compte plus, ni pour toi ni pour ton équipe. Dans l'app aussi.",
      },
      {
        type: "improved",
        text: "Pour les professeurs, l'éditeur des leçons de classe souligne chaque problème dans le texte et les liste tous sous « À corriger », chacun avec sa ligne et sa colonne, qu'un clic rejoint, au lieu de ne citer que le premier. L'enregistrement applique aussi les règles des leçons du site (pas de note de rédaction oubliée, pas de tiret cadratin, des schémas qui se dessinent), et l'aperçu signale leurs écarts pendant que tu écris.",
      },
    ],
  },
  {
    version: "3.5",
    date: "2026-10-17",
    title: "Leçons recentrées, profil public complet et une semaine de correctifs",
    changes: [
      {
        type: "improved",
        text: "Refonte de la page d'une leçon : une seule colonne centrée, un en-tête compact (durée, XP, difficulté, statut) et une barre d'outils qui reste en haut de l'écran. Elle donne ta section et ta progression, passe à la section précédente ou suivante, ouvre le plan dans un tiroir (avec l'auteur et le glossaire) et tes notes, et propose un mode focus qui replie la barre latérale. Sur un écran d'au moins 1440 px, les notes s'ouvrent à côté du texte.",
      },
      {
        type: "fixed",
        text: "Les schémas des leçons s'affichent de nouveau depuis le 11 octobre. Depuis le 6, un changement dans les couleurs du site les empêchait de se dessiner, et chacun des 240 schémas montrait son code à la place. Si un schéma ne peut pas se dessiner, la leçon le donne maintenant en texte, une flèche par ligne, avec sa légende ; c'est aussi ainsi que l'app les montre, au lieu d'une simple mention « Exercice interactif ». La même panne faisait planter les leçons qui ont un éditeur de code (bac à sable, défi Python) : elles s'ouvrent de nouveau depuis le 12 octobre.",
      },
      {
        type: "improved",
        text: "Les ateliers des leçons tiennent dans leur cadre, sur un téléphone aussi, et gardent leur propre style au lieu de prendre celui du texte. Chacun prend la largeur qu'il lui faut : l'éditeur hexadécimal et la trame décortiquée affichent 16, 8 ou 4 octets par ligne selon la place, l'atelier PHP et l'OSINT sur photo placent leurs panneaux côte à côte quand l'écran le permet, et les terminaux et les éditeurs grandissent avec la largeur. Leurs libellés ne descendent plus sous 12 px.",
      },
      {
        type: "improved",
        text: "Les nouveautés s'ouvrent dans un tiroir, et un nouveau sujet du forum, une demande d'aide, le défi lancé à un ami et la présentation de l'examen blanc dans une fenêtre, par-dessus la page où tu es : tu ne la quittes plus, et Précédent les referme. « Défier un ami » montre chacun de tes amis en carte, avec son avatar, son pseudo et son niveau, et un ami déjà en duel mène à ce duel. Dans l'app aussi, chaque ami à défier a son avatar, son pseudo et son niveau.",
      },
      {
        type: "improved",
        text: "Tes badges, avec ceux qu'il te reste à gagner, et tes certificats deviennent des onglets de ton profil. L'onglet Tournois de la page Défis est ouvert à tous : si tu n'es dans aucune classe, il t'explique qu'un tournoi réunit des classes. Les anciennes adresses mènent aux onglets ; l'app garde ses écrans.",
      },
      {
        type: "improved",
        text: "Les classements « Cette semaine » et « Ce mois » comptent enfin l'XP gagnée depuis lundi ou depuis le 1er, et non plus depuis toujours. Le nombre de joueurs classés et ta place portent sur tout le classement, un joueur au profil public mène à son profil avec son avatar, et la marque « Ami » signale tes amis, là comme sur le forum, les questions-réponses, les solutions, ta classe et les tournois. Dans l'app, les trois périodes et les avatars sur le classement, et la marque « Ami » sur le classement et la ligue.",
      },
      {
        type: "improved",
        text: "Ton profil public se complète : tes chiffres comptés en entier, et non plus arrêtés à 10 leçons ou 30 défis, ton année d'activité, tes trois badges les plus rares, tes parcours en cours et terminés, ton bilan de duels, tes contributions et une chronologie ; entre amis, le face-à-face de vos duels. Un visiteur connecté le lit dans l'interface du site, comme le catalogue public et le glossaire, un lien partagé s'affiche avec son propre aperçu, et ton profil mène enfin à ta page publique (« Voir mon profil public », « Copier le lien »). Dans l'app aussi, aux couleurs de son propriétaire.",
      },
      {
        type: "fixed",
        text: "Une leçon se termine par « Terminer », au bout de sa dernière section : le bouton du bas qui la validait dès la première section a disparu. « Leçon suivante » dit pourquoi elle est encore fermée, un exercice réussi le reste quand tu reviens en arrière, et une note qui n'a pas pu s'enregistrer le dit, avec « Réessayer », au lieu d'afficher « Sauvegardé auto ».",
      },
      {
        type: "fixed",
        text: "Sur les parcours, « Continuer » ouvre ta prochaine mission, depuis la page du parcours comme depuis sa carte du catalogue, puis l'examen final une fois les missions faites. Après un examen échoué, un compte à rebours dit quand tu pourras le repasser. Une leçon encore en brouillon ne compte plus parmi les missions, où elle fermait l'examen et le certificat. Ailleurs, les boutons qui ne faisaient rien ont été retirés.",
      },
      {
        type: "fixed",
        text: "Les colonnes latérales restent visibles en défilant, même plus hautes que l'écran : elles défilent jusqu'à leur dernière ligne, puis restent en place. La colonne d'un parcours, les indices d'un défi, le tableau d'un tournoi et les scores de l'examen blanc suivent ainsi la page.",
      },
      {
        type: "fixed",
        text: "Le catalogue des leçons se filtre vraiment par niveau et par statut, ses compteurs suivent les filtres, et la touche « / » place le curseur dans la recherche. Dans l'app, l'onglet Leçons gagne un filtre de statut.",
      },
      {
        type: "fixed",
        text: "La note d'un parcours tient dans sa colonne, sans cadre dans un cadre, et sa moyenne s'écrit partout comme dans l'app : « 5,0 · 1 avis ».",
      },
      {
        type: "fixed",
        text: "Un certificat n'a plus qu'un numéro, « CL-AAAA-XXXXXXXX », le même sur le PDF, sur la page de vérification et sur ton profil, et le PDF imprime l'adresse de vérification en entier. La page publique montre le nom tel qu'il a été imprimé à l'émission, et un certificat révoqué y est signalé avec sa date et son motif, comme sur ton profil et dans l'app.",
      },
      {
        type: "fixed",
        text: "Le code de double authentification se valide au sixième chiffre sur chaque écran qui le demande, activation comprise, et la désactiver demande une confirmation et un code frais. Une adresse pas encore confirmée se distingue d'un mauvais mot de passe, avec un bouton pour renvoyer l'e-mail de confirmation. Sur le site comme dans l'app.",
      },
      {
        type: "fixed",
        text: "Premiers pas : « Retour » rouvre, remplie, l'étape de ton identifiant, chaque étape permet de se déconnecter, et les leçons dont le test de positionnement t'a dispensé s'ouvrent enfin. Ta première mission tient compte des domaines choisis à l'inscription. À la connexion, l'adresse saisie reste après une erreur, un lien de réinitialisation expiré l'explique et en propose un autre, et ton avatar n'est plus remplacé par ta photo GitHub.",
      },
      {
        type: "fixed",
        text: "Les notifications mènent où elles promettent, et disent leur âge en heures, en jours ou en semaines plutôt qu'en milliers de minutes. Les réglages n'affichent plus d'interrupteur qui ne fait rien. Retirer un ami ou un message du forum demande confirmation, et le nom de l'auteur d'un message mène à son profil quand il t'est ouvert. Dans l'app aussi.",
      },
      {
        type: "fixed",
        text: "Les erreurs de saisie s'affichent en français, sur le site comme dans l'app, là où certaines sortaient en anglais.",
      },
      {
        type: "fixed",
        text: "Dans l'app, les liens d'une leçon s'ouvrent dans le navigateur, une notification touchée dans la barre du téléphone ouvre son écran, une leçon encore fermée renvoie à son parcours, et tous les quiz d'une leçon sont posés : quelques-uns, écrits autrement, manquaient. Les modules enregistrés pour lire hors ligne appartiennent à ton compte : ils sont oubliés à la déconnexion.",
      },
    ],
  },
  {
    version: "3.4",
    date: "2026-10-10",
    title: "Duels, tournois et examen blanc",
    changes: [
      {
        type: "new",
        text: "Des duels de quiz entre amis : tu défies un ami sur un parcours auquel vous avez accès tous les deux, et vous répondez aux cinq mêmes questions, tirées des quiz de ses leçons, en voyant le score de l'autre avancer en direct. Ton ami a la journée pour accepter ; le plus de bonnes réponses gagne, et à égalité celui qui a fini le premier. Dans l'app aussi.",
      },
      {
        type: "new",
        text: "Des tournois CTF entre classes ou entre écoles, dans l'onglet Tournois de la page Défis : pendant le tournoi, chaque flag rapporte ses points à ton équipe (ta classe, ou ton école) la première fois qu'un de ses membres le trouve, chaque joueur garde son propre score, et le tableau des équipes et des joueurs se met à jour en direct. Les élèves des classes inscrites sont prévenus par une notification. Dans l'app aussi.",
      },
      {
        type: "new",
        text: "Un examen blanc sur chaque parcours, pour s'entraîner avant l'examen final : trois questions par module, tirées des quiz de ses leçons, une minute et demie par question, et la copie rendue d'elle-même à la fin du temps. Le résultat se lit module par module (acquis, à consolider, à revoir), avec la correction de chaque question. Ni XP ni certificat, et autant d'essais que tu veux. Dans l'app aussi.",
      },
      {
        type: "new",
        text: "Les solutions des défis : une fois un défi résolu, tu peux publier la tienne (en Markdown, comme sur le forum) et lire celles des autres qui l'ont réussi. Tant que tu ne l'as pas résolu, tu n'en vois que le nombre. Dans l'app aussi.",
      },
      {
        type: "new",
        text: "Dans l'app, « Lire hors ligne », sous chaque module d'un parcours, enregistre ses leçons sur le téléphone pour les lire sans réseau ; la progression, les quiz et les notes attendent le réseau. L'écran « Hors ligne », depuis le profil, liste les modules enregistrés et la place qu'ils prennent.",
      },
      {
        type: "improved",
        text: "La machine Linux des leçons peut embarquer un vrai bash, git, sqlite3, nasm, gcc, gdb et python3. Le projet assembleur assemble et lie pour de vrai avec nasm, et le projet C compile avec gcc, écrit dans une vraie base SQLite et diagnostique un vrai plantage avec gdb.",
      },
      {
        type: "improved",
        text: "Les écrans de chargement ont la forme de la page qui arrive, sur chaque page : mêmes colonnes, mêmes cartes, des barres à la taille du texte qu'elles remplacent, sans couleur ni coin arrondi.",
      },
      {
        type: "fixed",
        text: "La fiche de révision d'un module se télécharge : elle répondait par une erreur.",
      },
      {
        type: "fixed",
        text: "La machine Linux tient dans son cadre, aux couleurs du site, et les encadrés des leçons ont retrouvé leur bordure.",
      },
      {
        type: "fixed",
        text: "Ouvrir la notification d'un duel ou d'un tournoi sans être connecté y ramène une fois connecté, au lieu du tableau de bord.",
      },
      {
        type: "fixed",
        text: "Dans l'app, l'écran d'un défi montre son adresse de connexion et sa pièce jointe, comme le site.",
      },
    ],
  },
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
        type: "improved",
        text: "Refonte de la page Défis. Le défi de la semaine, le même pour tout le monde, vaut le double de son XP jusqu'à lundi, avec son compte à rebours ; chaque défi montre un aperçu de ses pièces (les fichiers de sa machine, les premières lignes de son journal), l'XP que tu y as gagnée, et un défi verrouillé mène directement à celui qui l'ouvre. Des onglets Tous, À faire et Résolus trient la liste. Dans l'app aussi.",
      },
      {
        type: "new",
        text: "Chaque parcours a son illustration, sur sa carte du catalogue et en tête de sa page, sur le site comme dans l'app. Un parcours qui n'a pas encore la sienne prend celle de sa catégorie.",
      },
      {
        type: "new",
        text: "Ton profil public devient un portfolio : tes compétences par catégorie, tes certificats avec un bouton « Vérifier » (et, sur ta propre page, « Ajouter à LinkedIn »), et les défis que tu as résolus. L'app montre les mêmes sections.",
      },
      {
        type: "new",
        text: "Une fiche de révision par module : les points « à retenir » de ses leçons réunis en une fiche. Sur la page d'un parcours, le bouton « Fiche PDF » à côté du nom de chaque module la télécharge ; dans l'app, elle se lit à l'écran.",
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
