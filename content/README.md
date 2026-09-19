# Contenu pédagogique - source

Les leçons sources au format MDX, versionnées ici puis importées dans la base
via l'admin. Ce dossier est la source de vérité du contenu ; la base ne contient
que des copies importées (en DRAFT jusqu'à publication).

## Structure

```
content/lessons/<parcours>/NN-slug.mdx
```

Chaque fichier est une leçon : frontmatter YAML (refCode, slug, titre, catégorie,
difficulté, XP, prérequis) + corps MDX. Le format complet est documenté dans
[docs/LESSON_AUTHORING_GUIDE.md](../docs/LESSON_AUTHORING_GUIDE.md).

## Workflow d'import

1. **Importer les leçons** : admin → `/lessons/import`, glisser tout le dossier
   d'un parcours. Le lot est plafonné à 30 fichiers (`BATCH_MAX_FILES` dans
   `apps/admin/app/(admin)/lessons/import/actions.ts`), donc un parcours de 12
   passe d'un coup. Les prérequis internes au lot sont gérés automatiquement
   (ordre topologique). Les leçons arrivent en **DRAFT**.
2. **Créer les parcours** : `pnpm --filter @cyberlearn/db db:seed-paths`. Le
   script crée chaque parcours et y rattache ses leçons par refCode, dans
   l'ordre. Idempotent : ré-exécutable après l'import de nouvelles leçons.
3. **Publier** : relire dans l'admin, puis passer leçons et parcours en
   PUBLISHED.

## Parcours disponibles

Seize parcours, douze leçons chacun : **192 leçons**, `CL-LSN-001-V01` à
`CL-LSN-192-V01`, sans trou et sans doublon. Les refCodes sont attribués par
blocs de douze dans l'ordre des parcours, ce qui est la raison pour laquelle la
plage suffit à savoir à quel parcours appartient une leçon.

Le tableau est dérivé de `packages/db/prisma/seed-paths.ts`, qui reste la source
de vérité pour l'ordre d'étude à l'intérieur d'un parcours.

| refCode | Dossier | Parcours | Domaine | Difficulté | Durée | Leçons | Plage | Quiz final |
|---|---|---|---|---|---|:-:|---|:-:|
| CL-PATH-001-V01 | `python/` | Python : des bases à la pratique | DEV | BEGINNER | ~6 h | 12 | CL-LSN-001–012 | ✅ |
| CL-PATH-002-V01 | `javascript/` | JavaScript moderne : du navigateur à l'app | DEV | BEGINNER | ~6 h | 12 | CL-LSN-013–024 | ✅ |
| CL-PATH-003-V01 | `c/` | C : programmation système et bas niveau | DEV | BEGINNER | ~7 h | 12 | CL-LSN-025–036 | ✅ |
| CL-PATH-004-V01 | `asm/` | Assembleur x86-64 : au cœur du processeur | DEV | INTERMEDIATE | ~7 h | 12 | CL-LSN-037–048 | ✅ |
| CL-PATH-005-V01 | `linux/` | Linux et la ligne de commande | DEV | BEGINNER | ~7 h | 12 | CL-LSN-049–060 | ✅ |
| CL-PATH-006-V01 | `git-docker-cicd/` | Git, Docker et CI/CD | DEV | INTERMEDIATE | ~8 h | 12 | CL-LSN-061–072 | ✅ |
| CL-PATH-007-V01 | `cyber-fondamentaux/` | Cybersécurité : les fondamentaux | CYBERSEC | BEGINNER | ~7 h | 12 | CL-LSN-073–084 | ✅ |
| CL-PATH-008-V01 | `cyber-web/` | Sécurité web : le Top 10 OWASP en pratique | CYBERSEC | INTERMEDIATE | ~8 h | 12 | CL-LSN-085–096 | ✅ |
| CL-PATH-009-V01 | `cyber-crypto/` | Cryptographie : de la théorie à la pratique | CYBERSEC | INTERMEDIATE | ~8 h | 12 | CL-LSN-097–108 | ✅ |
| CL-PATH-010-V01 | `cyber-pentest/` | Test d'intrusion : la démarche offensive | CYBERSEC | ADVANCED | ~9 h | 12 | CL-LSN-109–120 | ✅ |
| CL-PATH-011-V01 | `cyber-grc/` | Gouvernance, risque et conformité | CYBERSEC | INTERMEDIATE | ~7 h | 12 | CL-LSN-121–132 | ✅ |
| CL-PATH-012-V01 | `cyber-blueteam/` | Blue team et SOC : défendre et détecter | CYBERSEC | INTERMEDIATE | ~8 h | 12 | CL-LSN-133–144 | ✅ |
| CL-PATH-013-V01 | `cyber-osint/` | OSINT : renseignement en sources ouvertes | CYBERSEC | INTERMEDIATE | ~7 h | 12 | CL-LSN-145–156 | ✅ |
| CL-PATH-014-V01 | `reseau/` | Réseaux : de la trame au web | NETWORK | INTERMEDIATE | ~8 h | 12 | CL-LSN-157–168 | ✅ |
| CL-PATH-015-V01 | `cloud/` | Le cloud : concevoir et sécuriser | NETWORK | INTERMEDIATE | ~8 h | 12 | CL-LSN-169–180 | ✅ |
| CL-PATH-016-V01 | `systeme/` | Administration système Linux | DEV | INTERMEDIATE | ~9 h | 12 | CL-LSN-181–192 | ✅ |

Le nom du dossier n'est pas le slug du parcours : `cyber-web/` porte
`cyber-web-owasp`, `systeme/` porte `admin-systeme-linux`. C'est le slug, pas le
dossier, qui doit correspondre au nom du fichier de quiz — voir
[content/quizzes/README.md](quizzes/README.md).

### À quoi ressemble un parcours

Exemple, `content/lessons/python/` — de zéro à un projet complet : variables et
types, conditions, boucles, fonctions, listes/tuples, dictionnaires/ensembles,
chaînes, compréhensions, gestion d'erreurs, modules, POO, et un projet final
(gestionnaire de tâches CLI).

| # | refCode | Leçon | Difficulté |
|---|---------|-------|------------|
| 1 | CL-LSN-001-V01 | Premiers pas en Python : variables et types | BEGINNER |
| 2 | CL-LSN-002-V01 | Conditions et logique booléenne en Python | BEGINNER |
| 3 | CL-LSN-003-V01 | Les boucles en Python : for et while | BEGINNER |
| 4 | CL-LSN-004-V01 | Écrire et utiliser des fonctions en Python | BEGINNER |
| 5 | CL-LSN-005-V01 | Listes et tuples en Python | BEGINNER |
| 6 | CL-LSN-006-V01 | Dictionnaires et ensembles en Python | INTERMEDIATE |
| 7 | CL-LSN-007-V01 | Manipuler les chaînes de caractères en Python | INTERMEDIATE |
| 8 | CL-LSN-008-V01 | Compréhensions de listes et de dictionnaires | INTERMEDIATE |
| 9 | CL-LSN-009-V01 | Gérer les erreurs avec try et except | INTERMEDIATE |
| 10 | CL-LSN-010-V01 | Modules et bibliothèque standard Python | INTERMEDIATE |
| 11 | CL-LSN-011-V01 | Introduction à la programmation orientée objet | INTERMEDIATE |
| 12 | CL-LSN-012-V01 | Projet : un gestionnaire de tâches en ligne de commande | INTERMEDIATE |

Les quinze autres suivent la même forme : douze leçons en progression, chacune
exécutable dans le navigateur quand le domaine le permet (CodePlayground,
PythonChallenge à tests automatiques), la dernière étant un projet ou une mise
en situation. Le titre exact de chaque leçon est dans son frontmatter — ne pas
recopier les 192 ici, ils dériveraient.

## Convention MDX importante

Le code à l'intérieur d'un `<CodePlayground>` est passé via la prop
`starterCode={` `` `...` `` `}` (template literal), et non en children. Le
validateur d'import compile le MDX avec `@mdx-js/mdx` sans le plugin
`remarkStripProseExpressions` du rendu : du code contenant des accolades
(f-strings, dictionnaires) passé en children casserait la compilation à
l'import **et** serait amputé au rendu. La forme prop-expression est sûre sur
les deux plans. De même, un `<Diagram>` mermaid ne doit pas contenir
d'accolades (`classDiagram` sans corps `{ }`, pas de nœud décision `{ }`).
