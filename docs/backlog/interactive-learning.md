# Backlog : exercices interactifs et améliorations

> Idées retenues le 1er octobre 2026, après la sortie du vrai terminal Linux
> (`<LinuxTerminal>`, v86). Rien n'est commencé sauf mention contraire.

## Principes

- **v1 reste gratuite à faire tourner.** Tout ce qui suit s'exécute dans le
  navigateur de l'élève ou sur l'infrastructure actuelle, sans coût mensuel
  nouveau. Ce qui demande un serveur payant est rangé en V2 (section G) et
  n'arrive que si le site a de la demande.
- **Une dépendance nouvelle se valide avant d'être ajoutée** (règle 10
  d'`AGENTS.md`). La colonne « Dépendance » dit lesquelles chaque idée
  demande.
- **Parité mobile** (règle 11). « Oui » : l'idée va aussi dans l'app. « Site
  seul » : l'app affiche une fiche à la place, comme pour le terminal Linux, et
  l'exception s'inscrit dans `docs/MOBILE_PARITY.md` avec sa raison.
- **Une idée, une PR**, testée, avec la version mobile ou l'entrée du registre.
- Les numéros restent fixes : une idée livrée est barrée avec le numéro de sa
  PR, comme dans `post-v1.md`.

## A. Terminal Linux et défis

| # | Idée | Ce que ça apporte | Dépendance | Mobile |
| --- | --- | --- | --- | --- |
| 1 | **Défis CTF sur la machine Linux** | Des défis avec un flag à trouver dans une machine préparée : logs à fouiller, droits mal réglés, indice caché. La page « Défis » reprend vie. | Aucune | Saisie du flag oui, machine site seul |
| 2 | **Enquête dans les logs** | De faux `auth.log` et `access.log` déposés dans la machine ; l'élève retrouve l'attaque avec `grep` et `awk`. Du contenu seulement. | Aucune | Site seul |
| 3 | ~~**Parcours Linux au vrai terminal**~~ | ~~Les exercices passent du terminal simulé au vrai Linux quand BusyBox le permet.~~ Fait : PR #354 pour les modules déjà écrits, puis chaque module jusqu'à #367. 61 leçons du parcours F2 ont leur exercice dans le vrai terminal ; le terminal simulé reste pour les mises en situation que BusyBox ne joue pas (serveur distant, services, comptes). | Aucune | Site seul |
| 4 | **Explication de commande** | Un clic sur une commande tapée dans le terminal affiche le rôle de chaque option. | Aucune | Site seul |
| 5 | **Image Linux complète** | Notre propre image avec bash, git, python3, sqlite3, gcc, nasm et gdb : tout le parcours Linux, et de vrais outils pour le C et l'assembleur. | Aucune (runtime) | Site seul |
| 6 | **Deux machines reliées** | Une attaquante et une cible dans la même page : scan, SSH, élévation de privilèges. | Aucune (runtime) | Site seul |

**1. Défis CTF.** La base sait déjà tout gérer : le modèle `Challenge` porte le
flag, le nombre d'essais, un prérequis et les types `CTF`, `PUZZLE`, `LAB` et
`SCRIPT`. `ChallengeHint` gère des indices qui coûtent de l'XP. La Server
Action de `apps/web/app/(app)/challenges/_actions/challenge-actions.ts` compare
le flag côté serveur. La page affiche `ChallengesWip` tant qu'aucun défi n'est
actif. Reste à faire :

- relier un défi à une machine (fichiers et vérifications, comme les props de
  `<LinuxTerminal>`) ;
- permettre d'écrire ces défis depuis l'admin ;
- publier les premiers défis.

Limite à garder en tête : la machine tourne dans le navigateur, donc tout ce
qu'elle contient se lit en fouillant la page. Pour que le partage de flags ne
serve à rien, le flag sera propre à chaque élève : le serveur le calcule à
partir de son identifiant, par exemple avec un HMAC. L'XP doit aussi rester
modérée. Seule une machine côté serveur (#36) garde un flag vraiment secret.

**3. Parcours Linux.** En cours : au 1er octobre, 30 des 50 leçons écrites du
parcours utilisent le vrai terminal. 16 utilisent encore le terminal simulé, à
trier une par une. Celles qui montrent `sudo`, apt ou les ACL le gardent ;
les autres passent au vrai terminal si BusyBox a les commandes (pas de `stat`,
par exemple).

**5. Image complète.** Elle remplace `buildroot-bzimage68.bin`, l'image de
démonstration du projet v86 (environ 10 Mo). La nôtre pèserait quelques
dizaines de Mo, à mesurer. Comme elle contient du GPL, il faut :

- publier la configuration Buildroot ;
- tenir l'offre de sources décrite dans
  `apps/web/public/runtimes/RUNTIMES_VERSIONS.md` ;
- mettre `scripts/verify-runtimes.sh` à jour.

**6. Deux machines.** v86 sait relier plusieurs machines dans le même onglet. À
confirmer par un prototype avec notre image avant d'écrire des leçons dessus.

## B. Exercices cyber

| # | Idée | Ce que fait l'élève | Dépendance | Mobile |
| --- | --- | --- | --- | --- |
| 7 | **Boîte mail piégée** | Il signale le phishing en cliquant sur les éléments suspects : domaine de l'expéditeur, lien, pièce jointe. | Aucune | Oui |
| 8 | **Trouve la faille** | Il clique sur la ligne vulnérable d'un extrait de code et nomme la faille. | Aucune | Oui |
| 9 | **Chasse dans les logs (façon SIEM)** | Il filtre un tableau d'événements pour retrouver l'IP et l'heure de l'attaque. | Aucune | Oui |
| 10 | **Incident à choix** | Il suit une histoire à embranchements où chaque décision a des conséquences. | Aucune | Oui |
| 11 | **Pare-feu** | Il écrit des règles, envoie des paquets de test et voit s'ils sont acceptés ou bloqués. | Aucune | Oui |
| 12 | **Éditeur hexadécimal** | Il reconnaît un fichier à ses premiers octets, répare un en-tête corrompu et trouve un message caché dans une image. | Aucune | Oui |
| 13 | **Casser des mots de passe** | Il lance une attaque par dictionnaire sur des hash faibles, dans le navigateur, et voit pourquoi la longueur compte. | Aucune | Oui |
| 14 | **Atelier crypto** | Base64, hexadécimal, César, Vigénère, XOR, SHA-256, avec un message à déchiffrer pour valider. | Aucune | Oui |
| 15 | **Vraie crypto et JWT** | Il manipule des clés RSA et EC, des signatures, et forge des JWT (`alg: none`, secret faible). | @noble/curves, jose | Oui |
| 16 | **Site vulnérable** | Il attaque un site : injection SQL, XSS, accès aux données d'un autre, upload piégé. Version simulée, ou vrai site PHP qui tourne dans la page. | Aucune, ou php-wasm | Simulée oui, PHP site seul |
| 17 | **Vraie base SQL** | Il apprend le SQL, puis réussit une injection sur une vraie base. | sql.js ou PGlite | Site seul |
| 18 | **OSINT sur photo** | Il lit les métadonnées d'une photo et retrouve le lieu sur une carte. | exifr, Leaflet | Site seul |

**16. Site vulnérable.** Les leçons du parcours Web montrent aujourd'hui une
sortie de sqlmap figée (`<SimulatedTerminal scenario="sqli-basic">`). La
version php-wasm fait tourner un vrai PHP dans la page, sans réseau ni rien
côté serveur. Son poids est à mesurer par un prototype.

## C. Réseau, Git et programmation

| # | Idée | Ce que ça apporte | Dépendance | Mobile |
| --- | --- | --- | --- | --- |
| 19 | **Décortiquer un paquet** | Un clic sur les octets d'une trame (Ethernet, IP, TCP, HTTP) montre à quel champ ils correspondent. | Aucune | Oui |
| 20 | **Calcul de sous-réseaux** | Des exercices d'adresses IP et de masques générés au hasard et corrigés automatiquement. | Aucune | Oui |
| 21 | **Mini Packet Tracer** | L'élève place PC, switch et routeur, règle les IP et les routes, puis teste le ping. | React Flow | Site seul |
| 22 | **Git** | Un bac à sable simulé, ou du vrai Git, avec le graphe des branches qui se dessine en direct. | Aucune, ou isomorphic-git | Simulé oui |
| 23 | **Bibliothèques Python en plus** | pycryptodome et cryptography pour la crypto, pandas pour l'analyse de logs. | Aucune (paquets Pyodide) | Site seul |
| 24 | **Animations pilotables** | Poignée de main TCP, chiffrement, pile d'appels, que l'élève avance pas à pas. | @remotion/player (Remotion est déjà dans `apps/marketing`) | Site seul |
| 25 | **Remettre dans l'ordre, associer** | Classer les couches OSI ou les étapes d'une attaque, associer un port à son protocole. | Aucune | Oui |

## D. Aides pour apprendre

| # | Idée | Ce que ça apporte | Dépendance | Mobile |
| --- | --- | --- | --- | --- |
| 26 | **Glossaire** | Les termes techniques des leçons sont soulignés et leur définition s'affiche au survol, avec une page qui les regroupe. | Aucune | Oui (appui long) |
| 27 | **Fiches de révision PDF** | Une fiche par module, générée à partir des récapitulatifs, avec `@react-pdf/renderer` qui sert déjà aux certificats. | Aucune | Oui |
| 28 | **Examens blancs chronométrés** | Un examen par certification (LPIC-1 pour le parcours Linux, par exemple), avec un score par domaine. Déjà là : le chronomètre du vrai terminal (`timeLimitMinutes`, PR #369), qui minute l'épreuve pratique du parcours Linux. | Aucune | Oui |
| 29 | **Mode hors ligne** | L'élève télécharge un module pour le lire sans réseau. | Aucune | App seule |

## E. Motivation, social et professeurs

| # | Idée | Ce que ça apporte | Dépendance | Mobile |
| --- | --- | --- | --- | --- |
| 30 | **Suivi des exercices pour les profs** | Les exercices réussis (terminal, Python) apparaissent dans le tableau de bord de la classe, avec un peu d'XP. | Aucune | Oui |
| 31 | **Duels de quiz entre amis** | Deux amis répondent aux mêmes questions en temps réel. | Aucune (Supabase Realtime) | Oui |
| 32 | **Tournois CTF entre classes ou écoles** | Des défis sur une période donnée, avec un tableau des scores en direct. | Aucune | Oui |
| 33 | **Write-ups** | Après un défi réussi, l'élève publie sa solution, visible seulement par ceux qui l'ont aussi réussi. | Aucune | Oui |
| 34 | **Profil portfolio** | Compétences, défis résolus, certificats et bouton « Ajouter à LinkedIn » sur `/u/[username]`. | Aucune | Site, lien depuis l'app |

**30. Suivi des exercices.** Aujourd'hui, aucun exercice n'est enregistré un
par un : `<PythonChallenge>` bloque seulement la fin de sa section tant qu'il
n'est pas réussi, et `<LinuxTerminal>` ne bloque rien. Leurs vérifications se
font dans le navigateur, donc un élève peut les truquer : on les affiche comme
« réussi » au professeur et l'XP reste modeste. Les vraies récompenses vont aux
flags des défis, vérifiés par le serveur.

**33. Write-ups.** La modération en place (filtre automatique, file d'attente
admin) s'applique aux solutions publiées.

## F. Documentation

| # | Idée | Ce que ça apporte |
| --- | --- | --- |
| 35 | **Corriger le guide de rédaction** | Dans `docs/LESSON_AUTHORING_GUIDE.md` : la section 6 « Sécurité » liste les composants autorisés sans `<LinuxTerminal>`, et la section 2 donne encore le format de code `CL-LSN-XXX-VYY`, alors que le catalogue utilise 5 chiffres (`CL-LSN-01033-V01`). |

## G. V2, si le site a de la demande (payant)

| # | Idée | Ce que ça apporte | Coût et précautions |
| --- | --- | --- | --- |
| 36 | **Vraies machines à la demande** | apt, systemd, Docker, vrai réseau, labs de pentest complets, flags vraiment secrets. Par exemple avec Vercel Sandbox, puisque le site est déjà sur Vercel. | Facturé à la minute. Réseau des machines fermé vers l'extérieur (pas de minage, pas d'attaque sortante), quotas par élève. |
| 37 | **Assistant d'indices par IA** | Explique une erreur ou donne un indice sans donner la réponse. | Une clé d'API et un coût par question. Les données des élèves, parfois mineurs via les classes, sont à protéger (registre RGPD). |

- Ont pourrais aussi faire que dans les quizs et les certifications il y a de vrai exo avec terminal ou autres
- ~~Dans le vrai terminal linux en dessus la ou est marqué les step avec les commandes ce n'est pas un liste ils sont tous afficher en 1 seule ligne~~ : fait, PR #370, une étape numérotée par ligne.
- certain code dans les playground pyoxide ou autre ont pas les indentations il faudrais verifier
## Ordre proposé

1. **Lot 1, sans dépendance** : 1, 26, 8, 7.
2. **Lot 2, dépendances à valider** : 16, 17, 22, 15, 21, 18, 24.
3. **Lot 3, prototypes d'abord** : 5, 6.
4. **V2** : 36, 37.

Les autres idées se placent entre ces lots selon les parcours en cours
d'écriture.

## Voir aussi

- `docs/LESSON_AUTHORING_GUIDE.md`, section 5.4b : écrire un exercice avec
  `<LinuxTerminal>`.
- `docs/backlog/terminal-v2-webvm.md` : le plan d'origine (CheerpX), remplacé
  par v86.
- `docs/MOBILE_PARITY.md` : ce qui est réservé au site, et pourquoi.
