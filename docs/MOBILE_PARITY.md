# Parité web ↔ mobile

## La règle

> **Tout ce qui est livré sur le site doit se retrouver sur l'app mobile, sauf
> indication contraire inscrite ici.**

Une fonctionnalité web-only est une **décision**, pas un oubli. Elle n'existe que
si elle est écrite dans le tableau « Volontairement web-only » ci-dessous, avec
sa raison. Tout le reste est une dette, et vit dans « Encore dû ».

Concrètement, pour toute PR qui ajoute ou modifie une surface du site :

1. si l'app mobile a la même surface, elle change dans la même PR ;
2. sinon, la ligne correspondante de ce fichier est mise à jour — soit en
   « encore dû », soit en « web-only » avec la raison ;
3. une PR qui touche une surface partagée sans faire l'un des deux est
   incomplète.

Comment l'app lit et écrit, parce que ce paragraphe disait autre chose et que
c'est lui qu'on relit avant de commencer une surface :

- **Les lectures vont directement à Supabase**, sous RLS, depuis
  `apps/mobile/lib/queries.ts`. C'est la RLS qui autorise, pas l'app.
- **Les écritures et les actions** passent par `apps/web/app/api/mobile/*` avec
  un jeton bearer, appelées depuis `apps/mobile/lib/api.ts`. Il y en a
  soixante et une : `avatar`, `badges`, `ban/acknowledge`, `ban/appeal`, `challenges`,
  `challenges/complete`, `challenges/detail`, `challenges/flag`, `challenges/hint`, `exam`,
  `exam/claim`, `exam/start`, `exam/submit`, `forum`, `forum/post/edit`,
  `forum/post/hide`, `forum/reply`, `forum/section`, `forum/topic`, `friends`,
  `friends/accept`, `friends/remove`, `friends/request`, `leaderboard`,
  `lesson-qa`, `lesson-qa/accept`, `lesson-qa/answer`, `lesson-qa/question`,
  `lesson-qa/upvote`, `lesson-rating`, `loadout`, `moderation`, `my-class`,
  `notes/dismiss`, `notes/report`, `notes/share`, `notes/shared`, `notes/unshare`, `onboarding/avatar`,
  `onboarding/finish`, `onboarding/goals`, `onboarding/profile`, `password`,
  `placement`, `placement/submit`, `profile`, `progress`, `quests/claim`,
  `quiz-answer`, `quiz-report`, `rank`, `rating`, `review`, `search`,
  `settings/profile`, `streak`, `support`, `support/reply`, `support/ticket`,
  `wrapped`.
- Le forum se lit aussi par des routes, pas sous RLS : ce qu'un lecteur voit
  (ses propres messages retirés compris) est une règle du dépôt
  (`forum.repository`), et l'avatar envoyé d'un auteur doit être signé avec la
  clé `service_role`.
- **Un compte banni ne passe pas** : `userFromBearer` fait la vérification que
  `requireRequestUser` fait sur le site, et toute route qui l'appelle refuse un
  compte banni. Seules `ban/acknowledge` et `ban/appeal` passent par
  `identityFromBearer`, qui ne la fait pas : ce sont les deux choses qu'un
  compte banni peut encore faire, comme sur `/banned`.
- Une route API n'est donc nécessaire que pour ce que la RLS ne peut pas
  servir : une écriture à valider, ou quelque chose qui réclame la clé
  `service_role` — signer un avatar privé, par exemple.

Les règles d'autorisation restent dans les dépôts (`packages/db`) et dans la
RLS — jamais réécrites côté app.

## État au 25 septembre 2026

### Sur les deux

| Surface | Web | Mobile |
| --- | --- | --- |
| Connexion, inscription, MFA ; mot de passe oublié jusqu'au nouveau mot de passe : un seul e-mail, avec un lien pour le site et un code pour l'app, et le nouveau mot de passe accepté sans l'ancien seulement dans les 15 minutes qui suivent (cookie sur le site, entrée `recovery` du jeton dans l'app), après la double authentification si le compte l'a | ✅ | ✅ (`app/(auth)/forgot-password.tsx`, `app/reset-password.tsx`) |
| Fin d'inscription : identifiant, nom affiché et bio, avatar parmi les huit du site ou une photo, puis les deux questions et les parcours suggérés (ou « Passer, j'explore seul ») ; même service (`apps/web/lib/onboarding/steps.ts`), mêmes avatars (`@cyberlearn/lib/onboarding/avatars`), reprise à la bonne étape comme sur le site | ✅ | ✅ (`app/onboarding.tsx`) |
| Test de positionnement, proposé à la fin de l'inscription à qui dit avoir déjà une base : les questions sans leurs réponses (ni l'explication qui les donne), une seule fois, corrigé sur le serveur ; les leçons débutant et intermédiaire des domaines maîtrisés débloquées, le badge, un parcours du catalogue recommandé (même service, `apps/web/lib/onboarding/placement.ts` ; mêmes mots, `@cyberlearn/lib/onboarding/placement`) | ✅ | ✅ (`app/placement.tsx`) |
| Catalogue de leçons + lecture d'une leçon | ✅ | ✅ |
| Défis : la liste avec l'état de chacun (résolu, en cours, disponible, verrouillé par son prérequis), l'énoncé, les indices payés en XP, le flag vérifié sur le serveur (le flag propre à l'élève pour un défi sur machine Linux), un puzzle ou un lab marqué fait ; mêmes fonctions des deux côtés (`apps/web/lib/challenges/catalogue.ts` et `play.ts`). La machine Linux et l'interpréteur Python d'un défi se jouent sur le site (voir les lignes « web seul » du terminal et du code), l'app y mène | ✅ (`/challenges`) | ✅ (écrans Défis, depuis le profil) |
| Glossaire : les mots techniques d'une leçon soulignés en pointillés la première fois qu'ils apparaissent dans une section, définition au survol ou au focus sur le site, au toucher ou à l'appui long dans l'app ; une page qui les liste tous (même liste, `@cyberlearn/lib/glossary`) | ✅ (`/glossaire`, info-bulle sans script) | ✅ (écran Glossaire, depuis le profil ou une définition) |
| Quiz d'une leçon : une seule réponse, correction, note sur la carte (`3/5`), options dans un ordre propre à chaque apprenant (le même sur les deux), « Signaler cette question » | ✅ | ✅ |
| « Trouve la faille » (`<FindTheFlaw>`) : toucher ou cliquer la ligne vulnérable d'un extrait, puis nommer la faille ; indice après la deuxième mauvaise ligne, explication avec le bon nom (mêmes props, lues par `parseFindTheFlaw` de `@cyberlearn/types`) | ✅ (`find-the-flaw.tsx`) | ✅ (`components/find-the-flaw.tsx`) |
| « Boîte mail piégée » (`<PhishingEmail>`) : signaler les éléments qui trahissent un hameçonnage (expéditeur, objet, paragraphe, lien, pièce jointe), adresse réelle du lien au survol ou à l'appui long, indices sur demande après trois éléments anodins (mêmes props, lues par `parsePhishingEmail` de `@cyberlearn/types`) | ✅ (`phishing-email.tsx`) | ✅ (`components/phishing-email.tsx`) |
| « Bac à sable Git » (`<GitSandbox>`) : un dépôt simulé piloté au terminal (commits, branches, fusions avec conflits ligne par ligne, rebase, reset), le graphe des branches redessiné à chaque commande, l'état des fichiers, les vérifications cochées au fil de l'exercice ; même moteur (`@cyberlearn/lib/git`), mêmes props (`parseGitSandbox` de `@cyberlearn/types`). Dans l'app, une rangée de commandes toutes prêtes au-dessus du clavier | ✅ (`git-sandbox.tsx`) | ✅ (`components/git-sandbox.tsx`) |
| Noter un parcours (dès une première mission terminée), moyenne affichée | ✅ | ✅ |
| Noter une leçon terminée (note et commentaire), moyenne affichée ; questions-réponses sous une leçon : poser une question, répondre, accepter une réponse à sa propre question, voter pour celle d'un autre, même modération automatique et même message « retenu » (même service, `apps/web/lib/lessons/rate-lesson.ts` et `lib/lessons/qa.ts`) | ✅ | ✅ |
| Tableau de bord : le prénom, la série et les révisions dues, le niveau (un anneau sur le site, une barre dans l'app), puis la mission, c'est-à-dire la leçon en cours ou la prochaine du parcours en tête (même classement, `@cyberlearn/lib/dashboard/featured-paths`), avec le module en cours dessiné leçon par leçon, faites, en cours, à venir (même calcul, `@cyberlearn/lib/dashboard/module-route`) ; les révisions dues, les quêtes et la série de la semaine, puis les quatre chiffres (mêmes libellés, `dashboard/stats`) et les derniers badges. L'app garde ses sections numérotées (`dashboard/sections`) ; le site ne les numérote plus | ✅ | ✅ (onglet Accueil) |
| Quêtes de la semaine : compte à rebours jusqu'au reset, complétion de la semaine, progression de chaque quête, récompense à réclamer une fois la quête faite (XP, gel de série), bonus de complétion ; une réclamation qui fait monter de niveau le dit (même service `apps/web/lib/quests/claim.ts`, mêmes mots et même calcul `@cyberlearn/lib/gamification/weekly-quests`) | ✅ | ✅ (onglet Accueil, `components/weekly-quests.tsx`) |
| Série : la série du jour et si elle tient, le record, les jours actifs de l'année, le prochain palier, le calendrier d'activité des douze derniers mois et la réserve de gels de série (même lecture `streakRepository.getOverview`, même calendrier et mêmes mots `@cyberlearn/lib/gamification/streak-calendar`). Le tableau de bord du site n'en montre que la semaine en cours, lundi à dimanche (`@cyberlearn/lib/gamification/streak-week`), et renvoie au profil pour l'année | ✅ (une seule carte, `components/streak-card.tsx` : la semaine sur le tableau de bord, la même carte prolongée de l'année sur le profil) | ✅ (Accueil, onglet Stats du profil, `components/streak-panel.tsx`) |
| Parcours + page d'un parcours | ✅ | ✅ |
| Examen final d'un parcours : règles, 30 minutes chronométrées, reprise d'une tentative en cours, délai de 48 h, correction détaillée, certificat à la réussite ; certificat réclamé sur un parcours sans examen (même service, `apps/web/lib/exam/exam-service.ts` et `lib/certificates/claim.ts`) | ✅ | ✅ |
| Révisions (SM-2) : file du jour, notation Oublié / Difficile / Facile, XP ; l'interrupteur `spacedRepetition` se règle et s'applique des deux côtés | ✅ | ✅ |
| Trouver mon parcours : deux questions, deux ou trois parcours suggérés avec leur raison (`/paths/guide`, `app/paths/guide.tsx`, même classement `@cyberlearn/lib/paths/suggest`) | ✅ | ✅ |
| Recherche globale : parcours d'abord, puis leçons, puis ses propres notes, au fil de la frappe à partir de deux lettres, limitée à ce que l'appelant peut ouvrir (même service `apps/web/lib/search/run.ts`, même classement `buildGroups`) ; une note s'ouvre sur sa leçon | ✅ (barre du site) | ✅ (loupe de l'Accueil, `app/search.tsx`) |
| Profil, progression, XP, niveau ; le rang affiché sur l'accueil vient du serveur (`findUserRank`, route `rank`), « Hors classement » pour un compte qui n'y figure pas | ✅ | ✅ |
| Classement + ligue ; le classement compte les apprenants à partir de leur premier XP, non masqués, et le dit à qui n'y figure pas (même filtre `RANKED_USER_FILTER`) | ✅ | ✅ |
| Amis : demandes reçues et envoyées, liste, accepter, refuser, annuler, retirer, personne prévenu d'un refus (même service, `apps/web/lib/friends/friends-service.ts`) ; le profil de quelqu'un et son bouton d'ami (mêmes libellés et mêmes transitions, `@cyberlearn/lib/social/friendship`), fermé à un inconnu quand il est privé, comme `/u/[username]` ; classement entre amis, sans ligne anonyme | ✅ | ✅ (`app/friends.tsx`, `app/u/[username].tsx`, onglet « Amis » du classement) |
| Confidentialité : visibilité dans le classement public (masqué, anonyme, public), visible par mes amis, profil public | ✅ (`/settings/privacy`) | ✅ (Réglages) |
| Modules d'un parcours : les leçons groupées sous le titre de leur module, dans l'ordre du parcours (même regroupement, `@cyberlearn/lib/paths/modules`) ; un parcours sans modules reste une liste | ✅ (page du parcours) | ✅ (écran du parcours) |
| Leçons d'un parcours débloquées une à une, sauf pour un administrateur, qui les ouvre toutes pour relire le catalogue ; le rôle est lu en base par le serveur (`apps/web/lib/lessons/access.ts`), l'app le reçoit par `/api/mobile/lesson-access` | ✅ (catalogue, leçon, page du parcours) | ✅ (écran du parcours, `lib/missions.ts`) |
| Bloc-notes ; partager une note avec sa classe ou ses amis (même liste, même modération : un refus nommé, l'auteur et ses professeurs prévenus, même service `apps/web/lib/notes/note-share.ts`), la reprendre ; les notes reçues, en lecture seule (même aperçu, `@cyberlearn/lib/notes/preview`), qu'on peut masquer de sa liste (même service, `dismissSharedNoteFor`) ou signaler à l'équipe, avec les mêmes raisons (`@cyberlearn/lib/notes/report-reasons`, même service `reportSharedNoteFor`) : la note quitte alors sa liste, l'auteur ne sait pas qui l'a signalée, et la console la retire de tous les partages ou classe sans suite | ✅ | ✅ |
| Casier (cosmétiques) | ✅ | ✅ |
| Notifications ; une notification liée à un sujet, une leçon, un parcours, un profil (demande d'ami) ou au bloc-notes ouvre l'écran correspondant | ✅ | ✅ |
| Nouveautés : les notes de version, de la plus récente à la plus ancienne, avec leurs marques Nouveau, Amélioration, Correctif (même liste `@cyberlearn/lib/changelog/entries`), et une marque « nouveau » tant que la dernière n'a pas été ouverte sur l'appareil | ✅ (`/changelog`, point dans la barre latérale) | ✅ (`app/changelog.tsx`, marque dans le hub du profil) |
| Forum : sections, derniers messages, sujets par page, ouvrir un sujet, répondre, modifier et retirer son message (un administrateur retire n'importe lequel), même modération automatique et même message « retenu » ; le markdown est découpé par le même module (`@cyberlearn/lib/markdown/note-markdown`) | ✅ | ✅ |
| Certificats | ✅ | ✅ |
| Badges : ceux qu'on a gagnés ; la collection, tous les badges actifs par rareté, gagnés ou verrouillés, avec la progression des verrouillés, et un badge déjà mérité mais jamais attribué rattrapé à la lecture (même service, `apps/web/lib/badges/collection.ts`) | ✅ (`/badges`) | ✅ (sous-onglets Badges et Collection de Profil, `components/badge-collection.tsx`) |
| Wrapped : une entrée qui n'existe que du 1er décembre au 7 janvier (même fenêtre, `@cyberlearn/lib/gamification/wrapped-window`), une histoire de six à neuf écrans selon l'année avec avance automatique, appui à droite ou à gauche, appui long pour lire ; mêmes écrans et mêmes mots (`@cyberlearn/lib/gamification/wrapped-story`), même récap (`apps/web/lib/wrapped/recap.ts`), page « pas encore ouvert » hors saison ; la carte finale en image au format story 1080×1920, mêmes chiffres et mêmes mots (`@cyberlearn/lib/gamification/wrapped-card`), téléchargée ou partagée sur le site, partagée ou enregistrée depuis la feuille de partage du téléphone dans l'app (`react-native-view-shot`, `expo-sharing`), ou partagée en texte | ✅ (étiquette dans la barre) | ✅ (étiquette dans l'en-tête de l'Accueil, `app/wrapped.tsx`) |
| Réglages : profil (nom affiché, bio, un des huit avatars ou une photo ; une photo ou un glyphe gardés tels quels tant qu'on n'en choisit pas un autre, même service `apps/web/lib/profile/update-profile.ts`), notifications (mêmes interrupteurs et mêmes mots, `@cyberlearn/lib/settings/notifications`, dont les avis par email ; l'alerte de série grisée des deux côtés tant que rien ne l'envoie), répétition espacée, sécurité | ✅ | ✅ |
| **Ma classe — côté élève** (travail donné, dates) | ✅ | ✅ |
| Avatar : glyphe, image intégrée, photo envoyée ; envoyer une photo depuis la bibliothèque du téléphone, recadrée au carré et réduite à 512 × 512 comme le recadreur du site (`AVATAR_EXPORT_PX`), à l'étape avatar de l'inscription et dans le profil, enregistrée aussitôt (mêmes contrôles et mêmes messages : JPEG, PNG ou WebP, 2 Mo au plus, octets vérifiés, bucket privé ; même service `apps/web/lib/avatar/upload.ts`) | ✅ | ✅ (`expo-image-picker`, sans caméra ni micro ; `expo-image-manipulator` pour la réduction) |
| Aide & demandes : déposer une demande (mêmes thèmes, même liste pour un établissement, même limite de débit, réponse à l'adresse du compte), la liste, le fil et la réponse ; une demande résolue ou close n'accepte plus de message, et le refus vient du dépôt (`ticket.repository`, envoyé à l'app en `acceptsReplies`) ; une demande finie dit quand et si l'équipe a répondu, et comment en ouvrir une autre (mêmes mots, `ticketConclusion`) | ✅ | ✅ |
| Compte banni : un seul écran (motif, date, durée), l'avis marqué comme vu, l'appel | ✅ (`/banned`) | ✅ (`app/banned.tsx`) |
| Modération côté auteur : ce qui a été signalé, où, quand et ce qu'il en est advenu, sans score ni règle (mêmes mots, `@cyberlearn/lib/moderation/record`) ; les avis de modération y mènent | ✅ (`/settings/moderation`) | ✅ (`app/moderation.tsx`) |

### Encore dû

Rien pour l'instant. La dernière comparaison, page par page, du site et des
écrans de l'app a trouvé cinq surfaces manquantes (quêtes, série, nouveau mot
de passe, recherche globale, nouveautés), portées depuis. Une surface ajoutée
au site sans son pendant mobile s'inscrit ici, avec ce qui la bloque.

### Volontairement web-only

Chacune de ces lignes est une décision, pas une dette.

| Surface | Raison |
| --- | --- |
| **Ma classe — côté prof** (donner du travail, écrire une leçon, construire un parcours) | Ce sont des tâches où l'on s'assoit devant un clavier. L'éditeur MDX a une barre d'outils, un aperçu en deux colonnes et un guide de composants ; le constructeur de parcours est une liste qu'on réordonne à côté d'un catalogue qu'on filtre. Les porter sur un écran de téléphone donnerait une version dégradée que personne n'utiliserait |
| **Console d'administration** (`admin.cyberlearn.fr`) | Application séparée, gate ADMIN + TOTP. Hors périmètre de l'app apprenant |
| **Exécuter le code d'une leçon** (`CodePlayground`, `PythonChallenge`) | Python, JavaScript, C ou l'assembleur tournent dans des moteurs WebAssembly chargés par la page (Pyodide pèse à lui seul une dizaine de Mo) et dans des workers du navigateur, que React Native n'a pas. L'app montre le code de départ, l'énoncé et les tests d'un défi, pour que la leçon se lise en entier, et renvoie au site pour les lancer (`lib/lesson-blocks.ts`) |
| **Vrai terminal Linux des leçons** (`LinuxTerminal`, machine v86) | Une machine x86 émulée en WebAssembly : 15 Mo à télécharger, un processeur sollicité en continu et un clavier physique pour taper des commandes. Sur un téléphone, ce serait lent, gourmand en batterie et pénible à utiliser. L'app affiche à la place la fiche de l'exercice, commandes et indices (`lib/lesson-blocks.ts`) ; pour un exercice chronométré (`timeLimitMinutes`), comme l'épreuve pratique d'un parcours, la fiche annonce sa durée et renvoie au site, où tourne le compte à rebours |
| **Vraie base SQL des leçons** (`SqlPlayground`, `SqlInjectionLab`) | SQLite tourne dans un Web Worker du navigateur (sql.js, 700 Ko de WebAssembly), que React Native n'a pas ; écrire des requêtes demande aussi un clavier. L'app affiche une carte avec la consigne et la requête de départ (ou le code du serveur vulnérable), pour que la leçon se lise en entier, et renvoie au site pour les lancer (`lib/lesson-blocks.ts`) |
| **OSINT sur photo** (`PhotoOsint`) | Les métadonnées sont lues dans le navigateur par exifr, et la carte est dessinée par Leaflet dans le DOM de la page, sans tuile externe ; ni l'un ni l'autre ne tournent dans React Native, et placer un point sur une carte de France demande un écran large. L'app affiche une carte avec la consigne et la légende qui circule, pour que la leçon se lise en entier, et renvoie au site pour jouer (`lib/lesson-blocks.ts`) |
| **Atelier réseau** (`NetworkLab`) | Un canevas où l'on tire des câbles entre des appareils et où l'on déplace des nœuds (React Flow, dans le DOM de la page), avec un panneau de configuration à côté : il faut un pointeur et un écran large. Le moteur (`@cyberlearn/lib/network`) est pur et tournerait dans l'app, mais sans le schéma l'exercice perd son sens. L'app affiche une carte (consigne, appareils de départ) et renvoie au site (`lib/lesson-blocks.ts`) |
| **Site vulnérable en PHP** (`PhpLab`) | Un vrai PHP 8.4 compilé en WebAssembly (13 Mo) tourne dans un Web Worker du navigateur, chaque requête sur une instance neuve : React Native n'a ni l'un ni l'autre, et attaquer une page puis corriger son code demande un clavier et un écran large. L'app affiche une carte avec la consigne et le code de la page à corriger, pour que la leçon se lise en entier, et renvoie au site pour jouer (`lib/lesson-blocks.ts`) |
| **Animations pas à pas** (`StepAnimation`) | Dessinées image par image dans le DOM par Remotion (`@remotion/player`), que React Native n'a pas. Les étapes et leurs textes sont partagés (`@cyberlearn/lib/animations/scenes`) : l'app les affiche en liste numérotée, pour que la leçon se lise en entier, et renvoie au site pour voir l'animation (`lib/lesson-blocks.ts`) |
| **Export RGPD, suppression de compte** | Actions irréversibles qui demandent une confirmation lue posément. Elles restent sur le web, et l'app y renvoie |
| **Épingler ou fermer un sujet du forum** | Geste de modération réservé aux administrateurs, fait depuis le site. L'app affiche l'état (« Épinglé », « Fermé ») et refuse une réponse dans un sujet fermé, comme le site |
| **Remise à zéro d'une progression** | Action d'administration, sur le compte de quelqu'un d'autre. Elle vit dans la console, pas dans une app apprenant |
| **Clic droit du bloc-notes** (menu sur une note, une note reçue, un dossier) | Un raccourci de pointeur, sans action propre : tout ce qu'il propose existe déjà sur le site (lecteur, panneau « Gérer ») et dans l'app, où chaque carte a ses boutons et où le glisser-déposer range les notes. Un téléphone n'a pas de clic droit, et un appui long y est déjà le geste qui déplace une note |
| **Aperçu d'une leçon non publiée par un administrateur** (`/lessons/<slug>` ouvre un brouillon, avec un bandeau et sans rien enregistrer ; la leçon vitrine `vitrine-des-composants` montre chaque composant) | Un outil de rédaction : on vérifie une leçon sur le site avant de la publier depuis la console, et la console est web-only. L'app lit les leçons publiées, comme les apprenants |
| **Aperçu réel dans l'éditeur de leçon** (`/preview/<jeton>` : le site rend un brouillon, section après section, dans un cadre de l'éditeur, console ou classe d'un professeur, rafraîchi après chaque pause) | Un outil de rédaction, comme la ligne au-dessus : l'éditeur est web-only et la page n'existe que pour lui. Elle s'ouvre sans session, par son jeton, pendant une demi-heure |
| **Garder un compte inactif** (`/account/keep`, lien du mail de préavis avant effacement) | Une page qu'on ouvre depuis un e-mail, sans être connecté, et qui n'a qu'un bouton : le lien s'ouvre dans le navigateur du téléphone comme ailleurs. Dans l'app, finir une leçon garde aussi le compte, puisque c'est de l'activité |

## Quand cette page a été écrite

Elle a été écrite parce que l'app avait pris du retard sans que personne puisse
dire de combien. Sans registre, « le mobile est en retard » est une impression ;
avec, c'est une liste qu'on peut finir.
