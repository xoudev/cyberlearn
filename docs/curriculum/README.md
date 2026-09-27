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
| T1 | ✅ **Modules** : table `PathModule` (titre, description, position), `PathLesson.moduleId`, affichage sur le site et dans l'app | Un parcours de 80 leçons en liste plate est illisible | Migration + RLS + web + mobile |
| T2 | ✅ **Quiz de module** : la dernière leçon de chaque module, écrite avec `QuizGroup`, sans mécanisme à part | Valider module par module | Aucune |
| T3 | **Cursus** : regrouper des parcours (`track = CAREER` existe, il faut la relation cursus → parcours) et un certificat de cursus | Le métier comme objectif | Moyenne |
| T4 | ✅ **refCodes** : passer à `CL-LSN-PPNNN-V01` (parcours sur 2 chiffres, leçon sur 3) | L'ancien format plafonne à 999 leçons | Petite (regex + docs) |
| T5 | ✅ **Import par module** : le lot de 30 fichiers suffit si on importe un module à la fois ; `seed-paths` lit `content/paths/*.json` et crée les modules | 1 500 fichiers | Petite |
| T6 | **Terminal Linux réel** (WebVM, `docs/backlog/terminal-v2-webvm.md`) | Linux, admin, DevOps et SOC ne s'apprennent pas sur un terminal simulé | Grosse |
| T7 | **Labs hébergés** pour le web et les tests d'intrusion : cibles vulnérables isolées, une par apprenant, sans accès sortant | C'est ce qui fait TryHackMe et Hack The Box. Sans ça, les parcours offensifs restent théoriques | Très grosse : infrastructure, coût, abus |

T1 à T5 conditionnent la vague 1. T6 peut arriver pendant la vague 1 (les
premiers modules de Linux tiennent avec le terminal simulé). T7 conditionne la
vague 3.

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
| 3 | Web front et back, Sécurité web, Tests d'intrusion, Windows et AD | ~380 h | T7 pour les labs offensifs |
| 4 | SOC, Forensic, DevOps, Cloud, C, Assembleur | ~380 h | T6 |

À la fin de chaque vague, les cursus dont tous les parcours sont publiés
ouvrent leur certificat.

**Premier jalon concret** : le module 1 de Linux, écrit au nouveau standard et
publié en brouillon. Il sert à valider le standard (longueur, pratique, quiz,
projet) avant d'en produire 230.
