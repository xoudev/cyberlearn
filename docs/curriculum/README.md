# Le nouveau catalogue : plan directeur

Ce dossier décrit le catalogue qui remplace les seize parcours actuels. Il sert
à savoir de quoi on parle avant d'écrire une ligne de contenu : ce qu'on vise,
comment une leçon est construite, ce qu'il faut changer dans la plateforme, et
dans quel ordre on produit.

- [`catalogue.md`](catalogue.md) : les vingt parcours et six cursus métier,
  module par module.
- [`vague-1/`](vague-1/) : le tronc commun détaillé leçon par leçon
  (Fondamentaux de l'informatique, Linux, Réseaux).

## L'ambition

Se mesurer aux plateformes de référence (OpenClassrooms, TryHackMe, Hack The Box
Academy, Coursera, Codecademy) sur ce qu'elles font de mieux, en français :

| Ce qu'elles font | Ce que ça implique ici |
| --- | --- |
| Des parcours de 50 à 150 heures qui mènent à un métier | Des parcours de 35 à 90 h, regroupés en cursus métier de 200 à 500 h |
| Une progression découpée en modules courts et validés | Parcours → modules → leçons, avec un quiz et un projet par module |
| De la pratique à chaque leçon, dans un vrai environnement | Un exercice exécutable par leçon, et un vrai Linux dans le navigateur (voir « Les labs ») |
| Des contenus alignés sur les référentiels du métier | Chaque parcours cite les référentiels qu'il couvre (ANSSI, NIST, ECSF, OWASP, certifications du marché) |
| Une certification qui a du sens | Examen par parcours, certificat de cursus sur projet + examen |

Le catalogue actuel fait 192 leçons de 1 600 mots en moyenne, pour 6 à 9 heures
par parcours. Le nouveau vise environ 1 200 heures et 1 500 leçons. Ce n'est pas
un élargissement, c'est un autre produit : on passe d'une introduction par
thème à une formation complète par métier.

## La structure

```
Cursus métier (200-500 h)      ex. Analyste SOC      → certificat de cursus
└── Parcours (35-90 h)         ex. Réseaux           → examen + certificat
    └── Module (4-8 h)         ex. Adressage IPv4    → quiz de module + projet
        └── Leçon (30-45 min)  ex. Les sous-réseaux  → quiz de leçon + pratique
```

- **Un parcours appartient à plusieurs cursus.** « Réseaux » sert à l'admin
  système, au SOC, au pentest et au DevOps. On l'écrit une fois.
- **Un module est une unité qu'on termine en une ou deux soirées.** 6 à 10
  leçons, un quiz de module (10 à 15 questions), un projet ou un lab guidé.
- **Le tronc commun** (Fondamentaux, Linux, Réseaux) est le prérequis de
  presque tout. Le test de positionnement existant permet de le sauter.

## Le standard d'une leçon

Ce qui fait la différence avec « rester en surface ». Chaque leçon a,
dans cet ordre :

1. **Objectifs** : deux à quatre verbes d'action vérifiables (« calculer le
   masque d'un sous-réseau », pas « comprendre les sous-réseaux »).
2. **Pourquoi ça compte** : une situation réelle, un incident, un cas métier.
3. **La théorie, complète** : le mécanisme expliqué jusqu'au bout, avec au
   moins un schéma (`Diagram`). Pas d'impasse sur ce qui est difficile.
4. **Une démonstration pas à pas** : commande par commande ou ligne par ligne,
   avec la sortie réelle et sa lecture.
5. **La pratique** : au moins un composant exécutable (`SimulatedTerminal`,
   `CodePlayground`, `PythonChallenge`, puis le terminal Linux réel).
6. **Les pièges** : les erreurs que font les débutants et les idées fausses.
7. **Pour aller plus loin** : sources primaires uniquement (RFC, pages `man`,
   documentation officielle, ANSSI, OWASP, NIST).
8. **Quiz** : 5 à 8 questions qui vérifient les objectifs, avec explications.
9. **Récapitulatif** : ce qu'il faut retenir en cinq lignes.

Longueur visée : 2 500 à 4 000 mots, soit 30 à 45 minutes. La CI vérifie déjà la
typographie, les diagrammes et les marqueurs d'auteur. On ajoutera un contrôle
de présence des sections 1, 5, 8 et 9.

**Le projet de module** est un énoncé, un environnement de départ, des critères
de réussite vérifiables et une correction commentée.

**Les parcours offensifs** (web, tests d'intrusion) s'appuient sur des
environnements volontairement vulnérables fournis par la plateforme. Chaque
module rappelle le cadre légal (autorisation écrite, périmètre), et le parcours
s'ouvre sur ce cadre avant toute technique.

## Ce qu'il faut changer dans la plateforme

À faire avant la première leçon, dans cet ordre.

| # | Chantier | Pourquoi | Ampleur |
| --- | --- | --- | --- |
| T1 | **Modules** : table `PathModule` (titre, description, position), `PathLesson.moduleId`, affichage sur le site et dans l'app | Un parcours de 80 leçons en liste plate est illisible | Migration + RLS + web + mobile |
| T2 | **Quiz de module** : même format que les quiz finaux (`content/quizzes/`), rattaché au module | Valider module par module | Moyenne |
| T3 | **Cursus** : regrouper des parcours (`track = CAREER` existe, il faut la relation cursus → parcours) et un certificat de cursus | Le métier comme objectif | Moyenne |
| T4 | **refCodes** : passer à `CL-LSN-PPNNN-V01` (parcours sur 2 chiffres, leçon sur 3) | L'ancien format plafonne à 999 leçons | Petite (regex + docs) |
| T5 | **Import par module** : le lot de 30 fichiers suffit si on importe un module à la fois ; `seed-paths` apprend les modules | 1 500 fichiers | Petite |
| T6 | **Linux réel dans le navigateur** : une machine virtuelle x86 émulée en WebAssembly, qui tourne sur l'ordinateur de l'apprenant (voir « Les labs ») | Linux, admin, DevOps et SOC ne s'apprennent pas sur un terminal simulé | Grosse |
| T7 | **Labs de sécurité sans serveur** : applications vulnérables et machines cibles qui tournent dans le navigateur, ou chez l'apprenant (voir « Les labs ») | Sans cibles, les parcours offensifs restent théoriques | Grosse |

T1 à T5 conditionnent la vague 1. T6 peut arriver pendant la vague 1 (les
premiers modules de Linux tiennent avec le terminal simulé). T7 conditionne la
vague 3.

## Les labs, sans serveur à payer

Le site est hébergé sur Vercel, qui exécute des fonctions courtes : il ne peut
pas faire tourner une machine par apprenant, et louer des serveurs pour ça
coûte de l'argent qu'on n'engage pas maintenant. La règle est donc : **un lab
tourne sur l'ordinateur de l'apprenant, jamais chez nous.** Vercel ne sert que
les fichiers et reçoit la validation.

Trois niveaux, du plus léger au plus complet :

| Niveau | Comment | Pour quoi | Coût pour nous |
| --- | --- | --- | --- |
| **1. Dans la page** | Des moteurs compilés en WebAssembly : une vraie base SQLite (sql.js) pour les injections SQL, une application vulnérable dont le « serveur » tourne dans un Service Worker et s'affiche dans une iframe isolée, Pyodide pour Python | Sécurité web (injections, XSS, contrôle d'accès, logique métier), SQL, crypto, analyse de journaux et de captures | Aucun : des fichiers statiques |
| **2. Une machine dans le navigateur** | Un émulateur x86 en WebAssembly qui démarre un vrai Linux, avec un réseau privé interne à l'émulateur (plusieurs machines peuvent se parler, rien ne sort) | Linux, scripts, services, élévation de privilèges, énumération d'un petit réseau de lab | Aucun : l'image disque est un fichier statique téléchargé une fois (50 à 200 Mo) |
| **3. Chez l'apprenant** | Des labs publiés en images Docker ou en machines virtuelles, qu'on lance sur son propre ordinateur avec une commande, à la manière de VulnHub | Active Directory, réseaux complets, projets de fin de parcours offensifs | Aucun : images publiques hébergées gratuitement (registre GitHub) |

Dans les trois cas, l'apprenant récupère un **drapeau** dans la cible et le
soumet sur le site, qui vérifie son empreinte : c'est la seule chose qui passe
par Vercel. La progression, l'XP et les badges suivent comme pour un quiz.

**Une cible vulnérable ne tourne jamais avec les droits du site.** L'application
de lab s'affiche dans une iframe `sandbox` sans `allow-same-origin`, donc sans
accès à la session de l'apprenant ni aux cookies de cyberlearn.fr : une XSS
réussie dans le lab reste dans le lab. Les machines émulées n'ont pas d'accès
réseau vers l'extérieur. Chaque type de lab passe une revue de sécurité avant
sa première leçon.

Les limites, à connaître :

- **Un drapeau identique pour tous peut circuler.** Pour les niveaux 1 et 2, le
  drapeau peut être dérivé de l'identifiant de l'apprenant ; pour le niveau 3, il
  est commun. C'est acceptable : on vérifie qu'on a appris, pas un concours.
- **Le niveau 2 demande une machine correcte** (quelques Go de mémoire) et un
  premier téléchargement lent. Chaque lab de niveau 2 a une version de niveau 1
  ou une correction commentée pour ceux qui ne peuvent pas le lancer.
- **Le niveau 3 demande d'installer Docker ou VirtualBox.** Il est réservé aux
  parcours avancés, avec une leçon d'installation guidée.
- **Les émulateurs ont des licences différentes.** v86 est libre (BSD) ;
  CheerpX, prévu dans le backlog, est gratuit pour un usage personnel mais
  payant pour un usage commercial. Le choix de la bibliothèque sera soumis
  avant de l'ajouter.

Des machines hébergées chez nous, une par apprenant comme TryHackMe, restent
possibles plus tard, quand le projet aura des revenus. Le plan n'en dépend
pas.

## Remplacer l'ancien catalogue

- **En base, on archive, on ne supprime pas.** Supprimer une leçon efface en
  cascade la progression, les notes, les questions et les avis des élèves qui
  l'ont suivie. Les seize parcours passent en `ARCHIVED` quand le nouveau tronc
  commun est publié : ils disparaissent du catalogue, les notes et certificats
  restent.
- **Dans le dépôt, on supprime les fichiers** de `content/lessons/` et
  `content/quizzes/` au même moment. Ils restent dans l'historique Git et
  servent de matière première : les 192 leçons actuelles couvrent une partie
  des nouveaux modules, qu'on réécrit au nouveau standard plutôt que de repartir
  de zéro.

## La feuille de route

| Vague | Contenu | Volume | Condition |
| --- | --- | --- | --- |
| 0 | Chantiers T1 à T5, gabarit de leçon, contrôle CI des sections | — | — |
| 1 | Tronc commun : Fondamentaux, Linux, Réseaux | ~170 h, ~230 leçons | Vague 0 |
| 2 | Python, Cybersécurité fondamentale, SQL, Cryptographie, GRC, OSINT | ~290 h | T6 pour Python système |
| 3 | Web front et back, Sécurité web, Tests d'intrusion, Windows et AD | ~380 h | T7 (labs de niveaux 1 à 3) |
| 4 | SOC, Forensic, DevOps, Cloud, C, Assembleur | ~380 h | T6 |

À la fin de chaque vague, les cursus dont tous les parcours sont publiés
ouvrent leur certificat.

**Premier jalon concret** : le module 1 de Linux, écrit au nouveau standard et
publié en brouillon. Il sert à valider le standard (longueur, pratique, quiz,
projet) avant d'en produire 230.
