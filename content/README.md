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
   d'un parcours (import multi-fichiers, jusqu'à 30 d'un coup). Les prérequis
   internes au lot sont gérés automatiquement (ordre topologique). Les leçons
   arrivent en **DRAFT**.
2. **Créer les parcours** : `pnpm --filter @cyberlearn/db db:seed-paths`. Le
   script crée chaque parcours et y rattache ses leçons par refCode, dans
   l'ordre. Idempotent : ré-exécutable après l'import de nouvelles leçons.
3. **Publier** : relire dans l'admin, puis passer leçons et parcours en
   PUBLISHED.

## Parcours disponibles

### Python : des bases à la pratique (`content/lessons/python/`)

`CL-PATH-001-V01` - DEV, débutant → intermédiaire, ~6 h, 12 leçons.

De zéro à un projet complet : variables et types, conditions, boucles,
fonctions, listes/tuples, dictionnaires/ensembles, chaînes, compréhensions,
gestion d'erreurs, modules, POO, et un projet final (gestionnaire de tâches CLI).
Chaque leçon est exécutable dans le navigateur (CodePlayground, PythonChallenge
à tests automatiques) ; le projet final propose aussi un travail personnel à
pousser sur GitHub.

| # | refCode | Leçon | Difficulté |
|---|---------|-------|------------|
| 1 | CL-LSN-001-V01 | Premiers pas : variables et types | BEGINNER |
| 2 | CL-LSN-002-V01 | Conditions et logique booléenne | BEGINNER |
| 3 | CL-LSN-003-V01 | Les boucles : for et while | BEGINNER |
| 4 | CL-LSN-004-V01 | Écrire et utiliser des fonctions | BEGINNER |
| 5 | CL-LSN-005-V01 | Listes et tuples | BEGINNER |
| 6 | CL-LSN-006-V01 | Dictionnaires et ensembles | INTERMEDIATE |
| 7 | CL-LSN-007-V01 | Manipuler les chaînes de caractères | INTERMEDIATE |
| 8 | CL-LSN-008-V01 | Compréhensions de listes et de dictionnaires | INTERMEDIATE |
| 9 | CL-LSN-009-V01 | Gérer les erreurs avec try/except | INTERMEDIATE |
| 10 | CL-LSN-010-V01 | Modules et bibliothèque standard | INTERMEDIATE |
| 11 | CL-LSN-011-V01 | Introduction à la POO | INTERMEDIATE |
| 12 | CL-LSN-012-V01 | Projet : gestionnaire de tâches CLI | INTERMEDIATE |

## Convention MDX importante

Le code à l'intérieur d'un `<CodePlayground>` est passé via la prop
`starterCode={` `` `...` `` `}` (template literal), et non en children. Le
validateur d'import compile le MDX avec `@mdx-js/mdx` sans le plugin
`remarkStripProseExpressions` du rendu : du code contenant des accolades
(f-strings, dictionnaires) passé en children casserait la compilation à
l'import **et** serait amputé au rendu. La forme prop-expression est sûre sur
les deux plans. De même, un `<Diagram>` mermaid ne doit pas contenir
d'accolades (`classDiagram` sans corps `{ }`, pas de nœud décision `{ }`).
