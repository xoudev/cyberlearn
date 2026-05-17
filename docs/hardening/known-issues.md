# Known Issues — Hardening v1

Tracking des limitations connues introduites pendant le hardening,
à adresser dans des PRs ultérieures.

## main build regression (resolved on C.3)

Avant la PR C.3, main avait une régression latente : depuis le
cleanup des compiled artifacts (PR 1 fix), apps/web ne pouvait
pas être build from-scratch — résolution des imports './prisma.js'
cassée. Le cache turbo masquait le problème puisque rien n'avait
forcé un rebuild de web entre le cleanup et la PR C.3.

Résolu en ajoutant @cyberlearn/db à transpilePackages dans les
next.config.ts des deux apps. @cyberlearn/email aussi ajouté à
apps/admin pour cohérence.

Leçon : faire un `pnpm build` from-scratch (sans cache turbo)
périodiquement, surtout après des changements de structure de
packages ou de tooling. Idéalement, ajouter à terme un job CI
qui build sans cache (genre une fois par jour ou sur main push).

## Tests e2e à ajouter

### IDOR certificats (PR 1.1)
Le test actuel (`certificate-idor.integration.test.ts`) couvre la
query Prisma directement, pas la route HTTP. Une régression où la
route serait modifiée en gardant la query intacte ne serait pas
détectée. À porter en test e2e Playwright quand Playwright sera
configuré dans apps/web (planifié avant beta).

## C.3 — expectedOutput exposé dans le DOM (by design)

Le composant code-playground.tsx (L588) affiche expectedOutput en
clair dans le DOM ("Sortie attendue : {expectedOutput}"). Pour les
challenges actuels (type "écris du code qui produit cette sortie"),
c'est by design — la sortie attendue fait partie de l'énoncé.

Si on ajoute des challenges où la sortie doit être devinée (mot
de passe, hash, etc.), à reconsidérer : ne pas rendre
expectedOutput dans le DOM, comparer côté serveur uniquement.

Surfacé par /security-review sur C.3 — pas un bug v1, mais à
garder en tête.

## C.2 — Dispatch par shape dans py-runner.js

Le worker partagé `apps/web/public/workers/py-runner.js` dispatche
entre run mode et test mode via `Array.isArray(tests)`. Si on ajoute
un 3e mode d'usage Python, refactorer en dispatch explicite par
champ `type` pour éviter une ambiguïté de shape.

## C.1 — JSCPP bundle pushé hors branch protection

Le commit `312d4ee` ("feat(code-runner): bundle JSCPP 2.0.9 locally as
browser IIFE") a été poussé directement sur main avant que la branch
protection soit activée. Tous les fichiers attendus sont présents et
`verify-runtimes.sh` passe 6/6. Aucune action corrective nécessaire,
tracé ici pour audit.

## Tests pré-existants en échec

### rls.integration.test.ts
Échoue car la DB de test n'est pas seedée avec les leçons attendues.
Pré-existant, pas une régression de PR 1. À fixer en PR séparée
(seed de test à compléter ou test à adapter).
