# Quiz finaux de parcours

Un fichier `<path-slug>.json` par parcours. Il définit le quiz final de
certification : un pool de questions dont `questionsToDraw` sont tirées par
tentative, et un score `passThreshold` (%) à atteindre pour décrocher le
certificat.

Le `path-slug` du nom de fichier doit correspondre au `slug` du parcours
(voir `packages/db/prisma/seed-paths.ts`).

## Format

```json
{
  "passThreshold": 75,
  "questionsToDraw": 12,
  "questions": [
    {
      "question": "Texte de la question ?",
      "options": [
        { "id": "a", "text": "..." },
        { "id": "b", "text": "..." },
        { "id": "c", "text": "..." },
        { "id": "d", "text": "..." }
      ],
      "correctOptionId": "b",
      "explanation": "Pourquoi b est la bonne réponse."
    }
  ]
}
```

Contraintes (validées par `db:seed-quizzes`, alignées sur le schéma admin) :
`passThreshold` 0-100, `questionsToDraw` 1-100 et <= nombre de questions,
2 à 10 options par question avec des `id` uniques, `correctOptionId` qui
pointe vers une option, `explanation` facultative. Pas de tiret cadratin.

## Charger en base

```bash
pnpm --filter @cyberlearn/db db:seed-quizzes          # dry run (validation)
pnpm --filter @cyberlearn/db db:seed-quizzes --apply  # écrit en base
```

Idempotent : le quiz du parcours est mis à jour et son pool de questions
remplacé à chaque exécution. Lancer après `db:seed-paths`.
