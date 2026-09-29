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

Tout se fait depuis admin → Leçons → **Synchroniser avec le dépôt**
(`/lessons/sync`), une fois la PR fusionnée et la console redéployée : la page
lit les fichiers de ce dossier, de `content/paths` et de `content/quizzes` tels
qu'ils sont déployés.

1. **Importer les nouvelles leçons** : section « Nouvelles leçons du dépôt »,
   bouton **Tout importer**. Chaque fichier passe les mêmes contrôles qu'un
   import manuel, dans l'ordre de ses prérequis. Les leçons arrivent en
   **DRAFT**, et l'import est journalisé (`lesson.import.success`, source
   `repository`).
2. **Synchroniser les parcours** : section « Parcours du dépôt », bouton
   **Synchroniser les parcours**. Chaque manifeste de `content/paths` crée ou
   met à jour son parcours, ses modules et l'ordre de ses leçons déjà
   importées (journalisé `path.sync`). Un nouveau parcours arrive en DRAFT ;
   un parcours existant garde son statut. Resynchroniser après l'import d'un
   nouveau module.
3. **Synchroniser les examens** : section « Examens de parcours du dépôt »,
   bouton **Synchroniser les examens**. Chaque fichier de `content/quizzes`
   écrit l'examen final du parcours de même slug : seuil, nombre de questions
   tirées et pool (journalisé `quiz.sync`). Le parcours doit exister, donc
   cette étape suit la précédente. Une question retirée du fichier est
   désactivée, jamais supprimée : une tentative en cours reste notée.
4. **Publier** : bouton **Publier le catalogue du dépôt**, ou leçon par leçon
   depuis la liste des leçons.

L'import manuel (`/lessons/import`, lots de 30 fichiers) et les scripts
`pnpm --filter @cyberlearn/db db:seed-paths` et `db:seed-quizzes` restent
disponibles, pour une base locale notamment ; les scripts et la console
écrivent avec le même code (`packages/db/src/catalogue`).

## Mettre à jour une leçon déjà importée

L'import refuse un refCode qui existe déjà. Une correction faite ici après
l'import n'arrive donc pas seule sur le site : elle passe par la même page,
section des mises à jour.

- La page compare chaque fichier de ce dossier à sa leçon en base et montre les
  différences : champs du frontmatter, puis passages du contenu.
- Elle signale une leçon modifiée dans l'éditeur depuis son dernier import (la
  mise à jour remplacerait ces modifications), un quiz modifié qui a déjà des
  réponses, et un slug différent.
- Rien n'est écrit sans confirmation, leçon par leçon ou toutes à la suite. Le
  fichier passe les mêmes contrôles qu'à l'import. Le slug, le statut et
  l'image de couverture ne changent jamais.
- Chaque mise à jour est journalisée (`lesson.sync`). Elle est refusée si la
  leçon a changé entre l'affichage et la confirmation.

Les fichiers sont embarqués dans le déploiement de l'admin
(`outputFileTracingIncludes` dans `apps/admin/next.config.ts`) : la page lit la
version du dépôt qui est déployée, rien à télécharger ni à envoyer.

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
dossier, qui doit correspondre au nom du fichier de quiz : voir
[content/quizzes/README.md](quizzes/README.md).

### À quoi ressemble un parcours

Exemple, `content/lessons/python/`, de zéro à un projet complet : variables et
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
en situation. Le titre exact de chaque leçon est dans son frontmatter : ne pas
recopier les 192 ici, ils dériveraient.

## Le nouveau catalogue : `content/paths/`

Le catalogue qui remplace les seize parcours ci-dessus est planifié dans
[docs/curriculum](../docs/curriculum/README.md). Chaque parcours y est décrit
par un manifeste, `content/paths/<slug>.json` : ses métadonnées et ses
**modules**, chacun avec son titre, sa description et ses leçons dans l'ordre.

```json
{
  "refCode": "CL-PATH-102-V01",
  "slug": "linux",
  "title": "Linux : de zéro à l'autonomie",
  "category": "DEV",
  "difficulty": "BEGINNER",
  "estimatedHours": 60,
  "description": "…",
  "modules": [
    { "title": "Découvrir Linux et le shell", "lessons": ["CL-LSN-02001-V01", "…"] }
  ]
}
```

- **Numérotation** : le parcours N du plan porte `CL-PATH-1NN-V01`, et ses
  leçons `CL-LSN-NNxxx-V01` (le numéro du parcours sur deux chiffres, puis
  celui de la leçon dans le parcours). Le format à trois chiffres reste valable
  pour les leçons existantes.
- **Vérification** : un test (`packages/db/src/__tests__/path-manifests.test.ts`)
  refuse un manifeste mal formé, un fichier qui ne porte pas le nom de son slug,
  une leçon listée deux fois ou dans deux parcours, et une leçon dont le numéro
  ne correspond pas à son parcours.
- **Synchronisation** : la console (« Synchroniser avec le dépôt ») ou
  `db:seed-paths` crée le parcours, ses modules, et range chaque leçon importée
  dans le sien. Une leçon pas encore importée est signalée et sautée ;
  resynchroniser après chaque import de module.
- **Quiz de module** : c'est la dernière leçon du module, écrite avec
  `QuizGroup` (voir le guide d'écriture). Aucun mécanisme à part.

## Convention MDX importante

Le code à l'intérieur d'un `<CodePlayground>` est passé via la prop
`starterCode={` `` `...` `` `}` (template literal), et non en children. Le
validateur d'import compile le MDX avec `@mdx-js/mdx` sans le plugin
`remarkStripProseExpressions` du rendu : du code contenant des accolades
(f-strings, dictionnaires) passé en children casserait la compilation à
l'import **et** serait amputé au rendu. La forme prop-expression est sûre sur
les deux plans. De même, un `<Diagram>` mermaid ne doit pas contenir
d'accolades (`classDiagram` sans corps `{ }`, pas de nœud décision `{ }`).
