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

Contraintes (validées par `packages/db/src/catalogue/quiz-files.ts`, alignées
sur le schéma admin, et vérifiées par un test unitaire en CI) :
`passThreshold` 0-100, `questionsToDraw` 1-100 et <= nombre de questions,
2 à 10 options par question avec des `id` uniques, `correctOptionId` qui
pointe vers une option, `explanation` facultative, pas deux fois la même
question dans un pool. Pas de tiret cadratin.

## Charger en base

En production : admin → Leçons → **Synchroniser avec le dépôt**, section
« Examens de parcours du dépôt », après avoir synchronisé le parcours. En local :

```bash
pnpm --filter @cyberlearn/db db:seed-quizzes          # dry run (validation)
pnpm --filter @cyberlearn/db db:seed-quizzes --apply  # écrit en base
```

Idempotent : le quiz du parcours est mis à jour et son pool aligné sur le
fichier. Une question déjà en base garde sa ligne (reconnue à son texte), une
nouvelle est créée, une question retirée du fichier est désactivée, jamais
supprimée, pour qu'une tentative en cours reste notée. Lancer après
`db:seed-paths`.
