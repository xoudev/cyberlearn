# CyberLearn - Fonctionnalités implémentées

> Dernière mise à jour : septembre 2026
>
> Les tableaux de routes sont relevés sur l'arborescence réelle des
> `page.tsx` et `route.ts`, pas de mémoire.

---

## Site utilisateur (`apps/web`)

### Pages & Routes

| Route | Description |
|---|---|
| `/` | Landing page publique avec terminal interactif |
| `/catalogue` | Catalogue public des parcours et des leçons |
| `/login` | Connexion (e-mail + mot de passe, OAuth GitHub) |
| `/register` | Création de compte |
| `/forgot-password` · `/reset-password` | Récupération du mot de passe |
| `/mfa` | Défi TOTP quand un facteur vérifié existe |
| `/contact` | Formulaire de contact / signalement, pour un visiteur (connecté, on dépose une demande depuis la fenêtre « Nouvelle demande » de `/support`) |
| `/duels` · `/duels/[id]` | Duels de quiz entre amis : défier, accepter, jouer, résultat ; le bilan compté sur tous les duels |
| `/tournaments` · `/tournaments/[id]` · `/tournaments/[id]/[slug]` | Tournois CTF entre classes ou écoles : les défis du tournoi, un flag par défi, le tableau des équipes et des joueurs en direct |
| `/paths/[slug]/mock-exam` | Examen blanc d'un parcours : trois questions par module, chronométré, score par module, correction |
| `/u/[username]` | Profil public d'un utilisateur : chiffres comptés en base (badges, leçons terminées, défis résolus), l'année d'activité jour par jour, « Face à face » et « Défier » entre amis, les trois badges les plus rares, les parcours en cours et terminés avec leur progression, compétences, certificats (ajout à LinkedIn sur sa propre page), défis résolus, le bilan des duels et les contributions, la chronologie, activité ; une image d'aperçu pour un lien partagé (sans nom pour un profil privé) et `noindex` sur un profil privé ; dans l'interface de l'app pour un visiteur connecté, seul pour un visiteur anonyme, aux cosmétiques de son propriétaire ; « Ami ✓ » et son menu, « Accepter » et « Refuser » une demande, « Défier en duel » qui suit l'amitié ; sur sa propre page, « Modifier mon profil » et « Copier le lien » |
| `/verify` · `/verify/[publicId]` | Vérification publique d'un certificat |
| `/download` | Page de téléchargement de l'app mobile |
| `/banned` | Page d'un compte suspendu, avec dépôt d'appel |
| `/legal` · `/legal/terms` · `/privacy` | Mentions, CGU, politique de confidentialité |
| `/account/delete/confirm` · `/success` · `/error` | Confirmation de suppression de compte (RGPD) |
| `/dev/components` | Galerie des composants, hors production |

#### Onboarding (nouvel utilisateur)

| Route | Description |
|---|---|
| `/onboarding` | Étape 1 - Infos (username, displayName, bio) |
| `/onboarding/avatar` | Étape 2 - Choix d'avatar (glyphe ou upload) |
| `/onboarding/placement-test` | Étape 3 - Introduction au test de placement |
| `/onboarding/placement-test/questions` | Test adaptatif (DEV / CYBERSEC / RÉSEAU) |
| `/onboarding/placement-test/result` | Résultats + génération des waivers |

#### App protégée (utilisateur connecté)

| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord, construit autour des parcours |
| `/lessons` · `/lessons/[slug]` | Catalogue et leçon (MDX, quiz, Q&A, notes) |
| `/paths` · `/paths/[slug]` | Catalogue des parcours et progression |
| `/paths/[slug]/exam` | Examen final à tirage aléatoire et temps limité |
| `/challenges` · `/challenges/[slug]` | Défis (sandbox Python, indices, flag) |
| `/revisions` · `/review` | Révisions espacées SM-2 |
| `/notes` | Bloc-notes, dossiers et partages reçus |
| `/badges` · `/certificates` | Collection de badges, attestations obtenues |
| `/leaderboard` | Classement global, et entre amis sur option ; depuis toujours, ce mois ou cette semaine (`?period=`), l'onglet dans l'adresse (`?board=`) |
| `/locker` | Casier des cosmétiques débloqués |
| `/forum` · `/forum/[category]` | Forum par catégories ; « Nouveau sujet » ouvre le formulaire dans une fenêtre sur la section (`?compose=1`) |
| `/forum/[category]/[topic]` | Sujet |
| `/forum/[category]/nouveau` | Pas de page : redirection vers `/forum/[category]?compose=1` |
| `/my-class` | Ma classe — vue élève ou vue enseignant |
| `/my-class/lessons/new` · `/[id]/edit` | Leçon écrite par un enseignant pour ses classes |
| `/my-class/paths/new` · `/[id]/edit` | Parcours composé par un enseignant |
| `/support` · `/support/[id]` | Aide & demandes, et fil d'une demande ; « Nouvelle demande » ouvre une fenêtre (`?request=1`) : thème, objet, message, réponse à l'adresse du compte |
| `/wrapped` | Récap annuel, ouvert du 1er décembre au 7 janvier |
| `/changelog` | Pas de page : redirection vers `/dashboard?news=1`. Les notes de version s'ouvrent dans un tiroir sur la page en cours, depuis le bouton Nouveautés de la barre du haut |
| `/profile` | Profil |
| `/settings/<section>` | Pas de page : redirection vers `/dashboard?settings=<section>`, où le volet des paramètres s'ouvre sur la section (`profile`, `privacy`, `preferences`, `notifications`, `moderation`, `account`, `data`). `/profile/edit` redirige vers la section profil |

#### API Routes

| Route | Description |
|---|---|
| `/api/cron/review-reminders` | Cron - rappels de révision SM-2 (quotidien) |
| `/api/cron/streak-reset` | Cron - reset du streak à minuit |
| `/api/cron/season-rollover` | Cron - clôture de saison, promotions et relégations |
| `/api/cron/keep-alive` | Cron - maintien en vie des free tiers ([détail](infra/keep-alive.md)) |
| `/api/certificates/[id]/download` | Téléchargement du certificat PDF |
| `/api/paths/[slug]/sheet?module=N` | Fiche de révision d'un module, en PDF (les points « à retenir » de ses leçons) |
| `/api/auth/send-email` | Hook d'envoi des mails d'authentification Supabase |
| `/auth/callback` | Échange PKCE après OAuth, contrôle MFA, synchronisation du profil |
| `/auth/confirm` | Confirmation par jeton implicite, maintenue pour les builds mobiles installés |
| `/api/search` | Recherche globale (parcours, leçons, notes) |
| `/api/me/export` | Export des données personnelles (RGPD Art. 20) |
| `/api/me/delete/request` · `/confirm` | Suppression de compte en deux temps (Art. 17) |
| `/api/mobile/progress` | Complétion d'une leçon, par le même flux que le web |
| `/api/mobile/leaderboard` | Classement et échelle de pod ; `?period=week\|month` pour la semaine ou le mois, sans paramètre la réponse d'avant |
| `/api/mobile/my-class` | Travail donné à l'élève |
| `/api/mobile/loadout` | Cosmétiques équipés |
| `/api/mobile/password` | Changement de mot de passe |

---

### Fonctionnalités détaillées

#### Authentification & Onboarding
- Supabase Auth : e-mail + mot de passe (12 à 128 caractères), GitHub OAuth,
  adresse à vérifier avant la première session, facteur TOTP optionnel
  (obligatoire côté console) — détail dans [authentication.md](authentication.md)
- Flux d'onboarding multi-étapes (profil → avatar → test de placement)
- Avatar : 8 glyphes (skull, ghost, matrix, circuit, bug, key, shield, wire),
  8 SVG intégrés, ou une image téléversée (bucket privé + URL signée,
  [ADR-003](adr/ADR-003-avatar-upload-private-bucket.md))
- Test de placement adaptatif (~20–30 questions) évaluant les connaissances en DEV, CYBERSEC et RÉSEAU
- Génération de **waivers** après le test : accès direct aux leçons avancées si score suffisant

#### Dashboard
- En-tête : la date, le prénom, la série et les révisions dues, le niveau en anneau avec l'XP et le rang
- La mission : la leçon en cours, sinon la prochaine du parcours en tête (classement `featured-paths`, à partir du niveau, du test de placement et des derniers domaines travaillés), avec le module en cours dessiné leçon par leçon (`module-route`)
- Révisions SM-2 dues du jour, en lignes
- La semaine : quêtes à cocher et à réclamer, série du lundi au dimanche, gels en réserve
- Où tu en es : les quatre chiffres (`dashboard/stats`) et les trois derniers badges
- Barre latérale en trois groupes (Apprendre, Progression, Communauté) et un bloc compte ; seul le nombre de révisions dues y est compté

#### Leçons
- Contenu rendu en MDX (remark-gfm, rehype-highlight, rehype-sanitize)
- Une colonne centrée : en-tête compact (fil d'Ariane, titre, chapeau, durée, XP, difficulté, statut), la prose dans une mesure de lecture (720 px), les composants à la largeur de l'article
- Navigation par sections depuis une barre d'outils collée sous la barre du haut : section n/N avec sa barre, précédente et suivante (ou « Terminer » sur la dernière), plan des sections en tiroir avec l'auteur et le glossaire, notes en tiroir (ancrées à côté du texte à partir de 1440 px), « Mode focus » qui replie la barre latérale
- Quiz optionnel intégré
- Q&A par leçon (questions, réponses, votes, marquer comme acceptée)
- Notation 1–5 étoiles avec recalcul des moyennes en temps réel
- Complétion avec attribution d'XP, évaluation des badges, création du ReviewSchedule SM-2
- Gestion des prérequis (chaîne de leçons)
- Un administrateur ouvre une leçon non publiée par son adresse, avec un bandeau et sans progression ni XP ; la leçon vitrine `vitrine-des-composants` rend chaque composant une fois

#### Challenges
- **4 types** : CTF (soumission de flag), SCRIPT (sandbox Python WASM), PUZZLE (honor system), LAB
- Sandbox Python dans le navigateur via Pyodide (Web Worker, timeout 10s)
- **Éditeur de code avec coloration syntaxique** Python (tokenizer embarqué - keywords, builtins, strings, commentaires, nombres, décorateurs, opérateurs)
- Hints révélables progressivement (coût en XP configurable)
- Compteur de tentatives et limite configurable
- Prérequis entre challenges
- Navigation précédent / suivant entre challenges
- First blood (premier utilisateur à compléter)

#### Parcours (Learning Paths)
- Progression par leçons ordonnées
- Complétion automatique détectée dès la dernière leçon obligatoire
- Génération automatique d'un **certificat PDF** signé (SHA-256) à la complétion
- URL de vérification publique (`/verify/[publicId]`)
- Téléchargement du PDF via l'API

#### Gamification
- **XP & Niveaux** (1–100)
  - Formule : niveau N requiert `N × 100` XP depuis le palier précédent (`50 × N × (N-1)` cumulatif)
  - Level-up déclenche une notification
- **Streak** : jours consécutifs d'activité, reset par cron la nuit
- **Badges** (10 types de critères, 4 raretés)
  - Critères : leçon complétée, parcours terminé, seuil XP, jours de série,
    maîtrise d'une catégorie, quiz parfait, leçon précise, niveau atteint,
    badge obtenu, custom
  - Raretés : COMMON, RARE, EPIC, LEGENDARY
  - Évaluaton automatique à chaque leçon / challenge complété
- **Leaderboard** : Top 100 utilisateurs par XP total, ou par XP gagné cette
  semaine ou ce mois (`XpLedger`, depuis lundi ou le 1er à minuit, heure de
  Paris : `leaderboardPeriodStart`), avec les mêmes règles de visibilité ; le
  nombre réel de joueurs classés et la place du lecteur, même au-delà des
  cent lignes ; un nom public mène au profil, avec son avatar

#### Révisions (Spaced Repetition SM-2)
- Algorithme SuperMemo-2 : `easeFactor`, `intervalDays`, `repetitions`, `nextReviewAt`
- ReviewSchedule créé à chaque complétion de leçon
- Page `/revisions` : la session du jour, cinq leçons au plus parmi celles dont `nextReviewAt ≤ now`, les plus en retard d'abord ; le reste attend son tour (`reviewRepository`, règles dans `@cyberlearn/lib/revisions/session`)
- Seules les leçons encore publiées reviennent ; une leçon retenue assez de fois (prochain intervalle ≥ 60 jours) sort du cycle
- Cron quotidien pour les rappels par notification, au compte de la session
- En préparation, à côté de la file SM-2 qu'elles remplaceront : les cartes de révision, une question de quiz par carte (tables `review_cards` et `review_sessions`, lecture de ses propres lignes seulement, écriture par le serveur). Une leçon terminée, sur le site ou dans l'app, met en file les questions ratées (dues le lendemain) et la dernière réussie (due une semaine plus tard), sauf les bilans de module, les projets et les leçons de classe ; même interrupteur `spacedRepetition`. Boîtes de Leitner : une bonne réponse fait monter la carte (revue 1, 3, 7 puis 21 jours plus tard) puis la retire, une erreur la renvoie à la première boîte ; une carte réussie au moins une fois (colonne `everCorrect`) et en retard de plus de 30 jours sort d'elle-même, et aucune séance ne la tire entre-temps ; une carte dont la question a quitté la leçon sort aussi, mais pas sur une leçon lue sans aucun quiz (MDX illisible). Une séance par jour, six cartes au plus, deux au plus par leçon, l'ordre des options tiré pour le jour. Règles dans `@cyberlearn/lib/revisions/cards`, lectures et écritures dans `reviewCardRepository` ; aucun écran ne les montre encore. Remises à zéro avec la progression et incluses dans l'export RGPD (les séances y nomment la leçon, jamais d'identifiant interne). À reprendre quand la file SM-2 sera retirée : les leçons de classe n'ont pas de cartes, alors que l'en-tête de « Écrire une leçon » (`/my-class/lessons/new`) promet aux enseignants « progression, XP, révisions » ; corriger cet en-tête, ou revoir l'exclusion avec le PO

#### Profil & Préférences
- Page de profil publique ou privée (toggle)
- Statistiques : niveau, XP, streak, badges, certificats
- Édition : displayName, bio, avatar
- Préférences : répétition espacée ; notifications : rappels de révision (dans la cloche, sans email), avis par email (modération, travail de classe) ; l'alerte de série et les nouveautés produit ne sont pas proposées tant que rien ne les envoie (`SHOWN_NOTIFICATION_SETTINGS`)
- Les paramètres s'ouvrent en volet par-dessus la page, sans navigation, depuis le rouage de la barre du haut et depuis tout lien interne vers `/settings/<section>` (classement, révisions, profil, avis de modération) : volet client `SettingsDrawerProvider` monté dans la coquille de l'app (`components/app-shell.tsx`, dessinée par `(app)/layout.tsx`), les sept sections chargées en une requête (`GET /api/me/settings`, lancée dès le survol d'un lien), le changement de section sans réseau (`<Activity>` garde la saisie). Il n'y a pas de page de paramètres : le code vit dans le dossier privé `(app)/_settings` (chargeurs `_lib/load-settings.ts`, vues de section, actions), et une adresse `/settings/<section>` venue d'un e-mail, d'une notification ou d'un favori est redirigée par `next.config.ts` vers `/dashboard?settings=<section>`, que le volet lit puis retire de l'adresse (entrée `settings` des fenêtres ouvertes par l'adresse, `components/query-dialogs.ts`, dessinées par `QueryDialogHost` monté dans la même coquille ; cadre `SideDrawer` de `@cyberlearn/ui`, voir `docs/dev/dialogs.md`)

#### Notifications
- 19 types : REVIEW_REMINDER, BADGE_EARNED, LEVEL_UP, PATH_COMPLETED,
  CERTIFICATE_ISSUED, ANNOUNCEMENT, TICKET_UPDATE, CLASS_ENROLLED,
  LESSON_ASSIGNED, PATH_ASSIGNED, NOTE_SHARED, MODERATION_ALERT, FORUM_REPLY,
  FRIEND_REQUEST, FRIEND_ACCEPTED, DUEL_INVITE, DUEL_RESULT,
  TOURNAMENT_ANNOUNCED, CERTIFICATE_REVOKED
- Badge de comptage non-lu dans la navbar
- Marquer une ou toutes les notifications comme lues

#### Contact & Support
- Formulaire à 8 thèmes (BUG, QUESTION, FEATURE_REQUEST, SECURITY,
  CONTENT_ERROR, ESTABLISHMENT_REQUEST, BAN_APPEAL, OTHER)
- Fil de conversation des deux côtés, statuts, réponse par mail
- Une demande RESOLVED ou CLOSED n'accepte plus de message, de part ni d'autre

#### Classes, établissements et enseignants
- Structure : établissement → promotion → classe, gérée dans la console
- Un enseignant écrit ses propres leçons et compose ses parcours, visibles de ses
  seules classes ; il dispose de l'éditeur de la console, blocs, code et aperçu rendu par le site compris
- Travail donné à une classe avec échéance et consignes, notifié par mail
- Corrigés et ressources distribués à la classe
- Tableau de bord d'avancement côté enseignant, page « Ma classe » côté élève

#### Forum, notes et amis
- Forum par catégories, sujets épinglés ou fermés, modération intégrée
- Bloc-notes par leçon, dossiers, et partage entre comptes passé par la modération
- Amis : demandes, acceptation, droits accordés (notes partagées, profil privé
  ouvert aux amis), classement entre amis sur activation explicite, activable
  depuis son onglet ; la marque « Ami » à côté du nom d'un ami (classement,
  ligue, forum, questions-réponses, solutions, classe, tournois), seulement
  sur une ligne qui montre déjà qui elle est

#### Modération et sanctions
- Filtrage à la publication : un contenu signalé est masqué avant relecture
- File de relecture côté console : restaurer ou supprimer
- L'auteur est notifié de la décision, et la retrouve dans ses réglages
- Bannissement avec motif, durée, échéance et dépôt d'appel

#### Saisons, quêtes et cosmétiques
- Ligues et pods, promotions et relégations à la clôture d'une saison (cron)
- Quêtes hebdomadaires, avec réclamation de la récompense
- Casier de cosmétiques débloqués au niveau, chacun dessiné comme lui-même
- **Wrapped** : récap annuel en story plein écran (une barre par slide, tape à
  droite pour avancer, maintien pour mettre en pause), ouvert du 1er décembre au
  7 janvier, avec carte finale exportable

#### Certificats
- Génération PDF côté serveur avec `@react-pdf/renderer`
- Hash SHA-256 stocké pour détection de falsification
- Révocable depuis la console, avec un motif (revokedAt + revokedReason) : le
  titulaire reçoit une notification CERTIFICATE_REVOKED qui mène à
  `/certificates`, où le certificat reste listé avec sa date de révocation et
  son motif ; la page publique `/verify/[publicId]` dit « Certificat révoqué »
  avec la date et le motif, et ne propose plus ni le PDF ni LinkedIn ; le
  téléchargement est refusé ; le parcours reste terminé, et son nœud final
  renvoie à `/certificates` au lieu du PDF. Un certificat révoqué par erreur
  peut être rétabli : même numéro, même PDF, notification CERTIFICATE_ISSUED
- Téléchargement direct via API

---

## Admin (`apps/admin`)

### Pages & Routes

| Route | Description |
|---|---|
| `/` | Redirige vers `/dashboard` |
| `/login` | Connexion admin |
| `/dashboard` | Stats globales, recherche, et issues Sentry non résolues |
| `/lessons` · `/lessons/archives` | Leçons en cours et archivées : recherche, filtres, tri et page dans l'adresse (`?q=&category=&difficulty=&status=&origin=&sort=&page=`), sélection et changement de statut groupé |
| `/lessons/new` | Créer une leçon (éditeur MDX + preview) |
| `/lessons/[id]/edit` | Éditer une leçon |
| `/lessons/import` | Import MDX en masse (frontmatter YAML + corps, 30 fichiers max, 500 Ko par fichier) |
| `/challenges` | Liste des challenges |
| `/challenges/new` | Créer un challenge |
| `/challenges/[id]/edit` | Éditer un challenge + gestion des hints |
| `/paths` | Liste des parcours |
| `/paths/new` | Créer un parcours |
| `/paths/[id]/edit` | Éditer un parcours (sélection et réordonnancement des leçons) |
| `/paths/[id]/quiz` | Composer l'examen final d'un parcours |
| `/badges` | Liste des badges |
| `/badges/new` | Créer un badge (10 types de critères) |
| `/badges/[id]/edit` | Éditer un badge |
| `/mfa` · `/mfa/setup` | Défi et enrôlement TOTP, obligatoires ici |
| `/users` | Liste des comptes, 25 par page, lue par la base sous les filtres de l'adresse (`?q=&role=&sort=&page=`) |
| `/users/pending` | Inscriptions en attente : comptes Supabase Auth à l'adresse jamais confirmée, sans profil (renvoyer le mail, confirmer l'adresse) |
| `/users/[id]` | Un compte, lu par les dépôts : connexion, profil, progression (positionnement, parcours et examens, dernières leçons), attestations révoquées comprises, bannissements, tickets, modération, dernières lignes du journal d'audit, préférences, classes. Gestes confirmés et inscrits au journal : déconnecter toutes les sessions, modifier ou remettre à zéro le nom, le pseudo, la bio et l'avatar (photo effacée du stockage), remettre à zéro le test de positionnement (l'apprenant est notifié), lever le délai d'un examen, corriger une leçon (remise à zéro, ou terminée sans XP), double authentification, remise à zéro complète, suppression |
| `/certificates` | Certificats émis, 25 par page, lus par la base sous les filtres de l'adresse (`?q=&path=&status=&sort=&page=`) ; révoquer avec un motif, rétablir |
| `/classes` · `/classes/new` · `/classes/[id]` | Classes, création, composition |
| `/classes/structure` | Établissements et promotions |
| `/tournaments` · `/tournaments/new` · `/tournaments/[id]` | Tournois CTF : période, classes, défis et leurs points ; classement, arrêt, suppression avant le début |
| `/moderation` | File de relecture des contenus signalés |
| `/tickets` · `/tickets/[id]` | Demandes et fil de conversation |
| `/audit` | Journal d'audit (qui a fait quoi, quand), 50 par page, filtré par acteur, cible, action et période |
| `/audit/export` | Le journal sous le filtre de la page, en CSV (50 000 lignes au plus) |
| `/settings` | Configuration de l'application |

---

### Fonctionnalités détaillées

#### Gestion des leçons
- Création et édition par blocs (titres, Markdown, et les vingt-huit composants sous forme de champs, exercices et labos compris, validés par le parseur de la page) ou en MDX ; l'aperçu est rendu par le site lui-même (`/preview/<jeton>`, rafraîchi après chaque pause, un aperçu rapide approximatif reste à côté) ; le panneau Guide liste les 28 composants par famille, avec leurs exemples à insérer, une recherche et un lien vers le guide de rédaction (registre `packages/lib/src/mdx/components.ts`)
- Gestion du statut : DRAFT → PUBLISHED → ARCHIVED, ligne par ligne ou sur
  une sélection, gardée d'une page à l'autre
- Liste lue page par page par la base ; ses filtres sont dans l'adresse, et les
  jauges de contenu du tableau de bord y mènent déjà filtrées (publiées,
  brouillons, archives)
- Suppression (uniquement si DRAFT)
- Import en masse

#### Gestion des challenges
- Création/édition de challenges (CTF, SCRIPT, PUZZLE, LAB)
- Champs spécifiques : flag (CTF/SCRIPT), starter code Python (SCRIPT)
- Gestion des hints : ajout, édition, réordonnancement, coût en XP
- Activation/désactivation

#### Gestion des parcours
- Création/édition avec sélection et ordonnancement des leçons
- Association d'un badge de complétion
- Gestion des templates de certificat PDF

#### Gestion des badges
- 10 types de critères avec formulaire dynamique
- 4 raretés (COMMON, RARE, EPIC, LEGENDARY)
- Activation/désactivation sans suppression si déjà attribué
- RefCode format : `CL-BDG-NNN`

#### Gestion des utilisateurs
- Liste paginée par la base (25 par page) : recherche sur l'adresse, le
  @pseudo et le nom, filtre de rôle, tri par colonne, le tout dans l'adresse
- Inscriptions en attente : les comptes de Supabase Auth dont l'adresse n'a
  jamais été confirmée n'ont pas encore de profil (il se crée à la première
  connexion) ; ils sont listés à part, lus par la clé de service, avec le
  renvoi du mail de confirmation et la confirmation forcée, tracés dans
  l'audit log
- Rôle STUDENT / TEACHER / ADMIN : chaque changement se confirme ; personne ne
  retire son propre rôle Admin, ni celui du dernier administrateur
- État de connexion d'un compte (adresse confirmée, méthodes, double
  authentification, dernière connexion), lu dans Supabase Auth
- Débloquer un compte : remise à zéro de la double authentification d'un
  apprenant (adresse saisie pour confirmer, e-mail à la clé ; jamais sur soi, ni
  sur un administrateur, ni sur un compte qui l'était il y a moins de 30 jours),
  lien de réinitialisation du mot de passe, renvoi ou
  forçage de la confirmation d'adresse ; tout est tracé dans l'audit log
- Déconnecter toutes les sessions d'un compte (site, app, console), jamais les
  siennes ; tracé dans l'audit log
- Fiche d'un compte lue par les dépôts : tickets (appels de bannissement
  marqués), contenus signalés et notes signalées, dix dernières lignes de
  l'audit log (visant le compte ou faites par lui), préférences en lecture,
  progression (test de positionnement, parcours et dernier examen de chacun,
  dernières leçons), attestations révoquées comprises avec leur lien de
  vérification
- Profil : modifier le nom affiché, le pseudo et la bio dans les bornes du
  site, ou remettre un champ à zéro (nom vers le pseudo, pseudo généré, bio et
  avatar effacés, photo envoyée supprimée du stockage) ; chaque geste se
  confirme et s'inscrit dans l'audit log, qui nomme les champs touchés sans en
  copier les valeurs
- Corrections d'apprentissage, confirmées et tracées : remettre à zéro le test
  de positionnement (avec ses dispenses ; une notification invite à le
  repasser), lever le délai de 48 h d'un examen
  (`quiz_attempts.cooldownWaivedAt`) ou clore sans délai une tentative jamais
  rendue dont le temps est écoulé, remettre une leçon à zéro ou la marquer
  terminée sans XP
- Bannissement avec motif, échéance, levée et appel
- Remise à zéro d'une progression, sans toucher au compte
- Suppression complète du compte et de ce qu'il possède, avec e-mail à la clé

#### Gestion des certificats
- Liste paginée par la base (25 par page) : titulaire (le nom imprimé sur le
  PDF, lien vers son compte), parcours, score, date d'émission, statut et
  numéro « CL-AAAA-XXXXXXXX » (lien vers la page de vérification) ; recherche
  sur le nom, le @pseudo, l'adresse, le parcours ou le numéro (la forme du
  PDF, l'identifiant complet ou l'adresse de vérification) ; filtres parcours
  et statut (valides, révoqués) ; tri par colonne ; le tout dans l'adresse
- Révocation sur la ligne, avec un motif obligatoire (5 à 500 caractères) et
  une confirmation qui nomme le certificat : écrite seulement sur un
  certificat encore valide (une seconde révocation ne change rien), avec sa
  ligne d'audit `admin.certificate.revoke` et la notification du titulaire
  dans la même transaction
- Rétablissement d'un certificat révoqué par erreur : même numéro, même PDF,
  ligne d'audit `admin.certificate.reinstate` (avec le motif effacé),
  notification au titulaire

#### Modération
- File de relecture des contenus bloqués à la publication
- Restaurer ou supprimer, décision notifiée à l'auteur
- Une décision peut porter une sanction

#### Classes et établissements
- Établissements et promotions, création et édition
- Classes : composition, enseignants, membres, invitations par e-mail
- Un élève s'ajoute par adresse ou par @pseudo ; une adresse inconnue devient
  une invitation, un @pseudo inconnu est refusé (un pseudo ne se réserve pas
  en s'inscrivant)

#### Tickets de support
- Liste avec filtres par statut et thème
- Mise à jour du statut (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- Fil de conversation avec le demandeur ; une demande RESOLVED ou CLOSED
  n'accepte plus de message, de part ni d'autre

#### Audit
- Log de toutes les mutations admin (qui, quoi, quand, sur quelle ressource)
- IP pseudonymisée (hash SHA-256 + sel)
- Lu page par page, filtré par acteur (identifiant, adresse, @pseudo), cible
  (identifiant ou type), action exacte et période (jours de Paris) ; la page
  d'un compte ouvre son propre journal
- Export CSV du filtre courant (séparateur point-virgule, UTF-8 avec BOM,
  cellules prises pour des formules neutralisées), 50 000 lignes au plus :
  au-delà, la page demande un filtre plus étroit ; l'export est lui-même tracé

---

## Packages partagés

### `packages/db` - Couche données
- **Prisma 6** : 60 modèles, 23 enums
- 28 repositories : audit-log, badge, ban, certificate, challenge, class, cosmetic, forum,
  friendship, leaderboard, league, lesson, moderation, note, note-folder,
  note-share, notification, path, qa, quest, quiz, rating, search, stats,
  streak, ticket, user, wrapped
- Migrations versionnées, RLS incluse : toute migration qui crée une table
  active la RLS et pose ses policies dans le même fichier
- Row Level Security sur toutes les tables du schéma `public`, vérifiée par un
  gate CI fail-closed (aucune table exposée, >= 56 policies)
- Seeds séparés : `db:seed`, `db:seed-paths`, `db:seed-quizzes`,
  `db:seed-cosmetics`, `db:seed-season`
- Les sources ne sont jamais compilées à côté d'elles-mêmes (`noEmit` +
  garde `.gitignore`) : un `.js` émis passerait devant son `.ts` à la
  résolution et les tests liraient le dernier build

### `packages/lib` - Logique métier
- `xp.ts` - Calcul XP/niveau · `sm2.ts` - SuperMemo-2 · `pseudonymize.ts` - HMAC
- `gamification/` - `badge-evaluator.ts` (les 10 critères, fonction pure),
  `streak-state.ts`, `day.ts`, `week.ts`, `league.ts`, `quest.ts`, `tier.ts`,
  `wrapped.ts`, `wrapped-window.ts` (la fenêtre du 1er décembre au 7 janvier)
- `moderation/` - `moderate.ts`, `lexicon.ts`, `normalise.ts`, `ban.ts`,
  `notice.ts`
- `mdx/` - `sanitize.ts` (allowlist), `toc.ts`, `split-sections.ts`
- `search/` - `rank.ts`, `fold.ts` · `social/friendship.ts` ·
  `quiz/quiz.ts` · `placement/scoring.ts` · `terminal/scenarios.ts`
- `auth/guards.ts` - `requireUser()` / `requireAdmin()`

### `packages/types` - Types partagés
- Schémas Zod pour toutes les validations (Server Actions, Route Handlers)
- Types TypeScript inférés

### `packages/ui` - Design tokens & composants UI
- `tokens.css` - couleurs, espacements, polices, thèmes clair et sombre
- Composants : XPBar, LevelBadge, RarityBadge, BadgeMedallion, LessonCard,
  PathProgress, NotificationBell, MdxEditorPanel, Select

### `packages/email` - Templates e-mail
- Neuf templates React Email : magic-link, ticket-reply, work-assigned,
  class-enrolled, class-invitation, ban-notice, moderation-notice,
  account-deleted, account-deletion-confirm
- `theme.ts` porte les tokens et le vocabulaire de styles partagé, `shell.tsx`
  le `<head>` commun : un template n'ajoute que ce qui lui est propre, et il
  n'y a de `border-radius` nulle part — le site est carré
- `subject.ts` - un envoi, un sujet : deux mails du même type ne portent jamais
  la même chaîne, sinon le client de messagerie les empile
- Envoi via Resend

### `packages/config` - Configuration partagée
- ESLint, TypeScript (strict + noUncheckedIndexedAccess), Biome

---

## Modèle de données - résumé des enums

| Enum | Valeurs |
|---|---|
| `UserRole` | STUDENT, TEACHER, ADMIN |
| `Category` | DEV, CYBERSEC, NETWORK |
| `Difficulty` | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `ContentStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `ContentAudience` | CATALOGUE, CLASS |
| `PathTrack` | SKILL, CAREER |
| `ChallengeType` | CTF, PUZZLE, LAB, SCRIPT |
| `ProgressStatus` | NOT_STARTED, IN_PROGRESS, COMPLETED |
| `BadgeRarity` | COMMON, RARE, EPIC, LEGENDARY |
| `BadgeCriterionType` | LESSON_COMPLETED, PATH_COMPLETED, XP_THRESHOLD, STREAK_DAYS, CATEGORY_MASTERY, PERFECT_QUIZ, LESSON_SPECIFIC, LEVEL, BADGE_EARNED, CUSTOM |
| `XpSource` | LESSON, BADGE, QUEST, CHALLENGE, REVIEW |
| `QuestType` | LESSON_COMPLETED, PERFECT_QUIZ, STREAK_DAYS, FORUM_POST, WEEKLY_BONUS |
| `SeasonStatus` | ACTIVE, CLOSING, CLOSED |
| `LeagueDivision` | BRONZE, ARGENT, OR, PLATINE, DIAMANT |
| `LeaderboardVisibility` | HIDDEN, ANONYMOUS, PUBLIC |
| `CosmeticType` | TERMINAL_THEME, HEXAGON_STYLE, PROFILE_FRAME, ACCENT_COLOR |
| `WrappedPeriod` | MONTH, SEASON |
| `FriendshipStatus` | PENDING, ACCEPTED |
| `ModerationVerdict` | ALLOW, REVIEW, BLOCK |
| `ModerationOutcome` | PENDING, UPHELD, OVERTURNED |
| `NotificationType` | REVIEW_REMINDER, BADGE_EARNED, LEVEL_UP, PATH_COMPLETED, CERTIFICATE_ISSUED, ANNOUNCEMENT, TICKET_UPDATE, CLASS_ENROLLED, LESSON_ASSIGNED, PATH_ASSIGNED, NOTE_SHARED, MODERATION_ALERT, FORUM_REPLY, FRIEND_REQUEST, FRIEND_ACCEPTED, DUEL_INVITE, DUEL_RESULT, TOURNAMENT_ANNOUNCED, CERTIFICATE_REVOKED |
| `TicketTheme` | BUG, QUESTION, FEATURE_REQUEST, SECURITY, CONTENT_ERROR, ESTABLISHMENT_REQUEST, BAN_APPEAL, OTHER |
| `TicketStatus` | OPEN, IN_PROGRESS, RESOLVED, CLOSED |

Les 23 enums du schéma, relevés sur `packages/db/prisma/schema.prisma`.
