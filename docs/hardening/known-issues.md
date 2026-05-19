# Known Issues — Hardening v1

Tracking des limitations connues introduites pendant le hardening,
à adresser dans des PRs ultérieures.

## main build regression (resolved on C.3)

Avant la PR C.3, main avait une régression latente : depuis le
cleanup des compiled artifacts (PR 1 fix), les apps ne pouvaient
pas être buildées from-scratch — résolution des imports `'./prisma.js'`
cassée. Le cache turbo masquait le problème puisque rien n'avait
forcé un rebuild entre le cleanup et la PR C.3.

### Analyse du root cause

`@cyberlearn/db` utilise NodeNext module resolution : les imports
internes ont des extensions `.js` explicites (`import './prisma.js'`).
Sur un checkout CI sans artifacts compilés, webpack cherche
`prisma.js` littéralement et échoue — même avec `transpilePackages`
qui indique à Next.js de traiter le package, mais pas à webpack
comment résoudre les extensions.

### Fix : deux couches complémentaires

**Couche 1 — `transpilePackages`** (commit `0c71994`) :
Ajoute `@cyberlearn/db` (et `@cyberlearn/email` sur admin) à
`transpilePackages` dans les deux `next.config.ts`. Nécessaire
pour que Next.js inclue les packages workspace dans son pipeline
de compilation. Seul, insuffisant : CI continuait à échouer.

**Couche 2 — `extensionAlias`** (commit `8cc36a5`) :
```typescript
webpack: (config) => {
  // CRITICAL — ne pas retirer (voir ci-dessous)
  config.resolve.extensionAlias = {
    ".js": [".ts", ".tsx", ".js", ".jsx"],
  };
  return config;
},
```
Indique à webpack : quand tu vois un import `.js`, essaie d'abord
`.ts` / `.tsx`. Les sources `.ts` étant dans git, webpack les
trouve même sans artifacts compilés.

Tests locaux (30 artifacts db cachés, simulation CI clean state) :
- `transpilePackages` + `extensionAlias` : ✅ build OK
- `extensionAlias` seul : ✅ build OK (c'est la couche active)
- `transpilePackages` seul : ❌ `Module not found: Can't resolve './prisma.js'`

### CRITICAL : ne pas retirer extensionAlias

`extensionAlias` dans les deux `next.config.ts` est le fix actif.
Le retirer casse le build sur tout checkout CI ou développeur qui
n'a pas de `.next` cache et pas d'artifacts `packages/db/src/*.js`
sur disque. Ce commentaire et cette entrée existent pour qu'on ne
le retire jamais "pour faire le ménage".

### Leçon

Faire un `pnpm build` from-scratch (sans cache turbo) périodiquement,
surtout après des changements de structure de packages ou de tooling.
Idéalement, ajouter un job CI qui build sans cache (une fois par
jour ou sur push sur main).

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

## C.5 — Labels UI mentionnant "CDN" mais chargement local

`code-playground.tsx` contient encore deux labels UI qui mentionnent
"CDN" alors que JSCPP est désormais bundlé localement depuis C.4 :
- L192 : `badge: "jscpp · CDN"`
- L482 : `"C11 · jscpp"`

Pas un bug fonctionnel, mais le label "CDN" est trompeur pour
l'utilisateur depuis C.4. À corriger en C.5 (cleanup final
`code-playground.tsx`).

Surfacé pendant C.4.

**RESOLVED** (PR C.5 — chore/code-playground-cleanup, 2026-05-19)
Le label `"jscpp · CDN"` (L192 de code-playground.tsx) remplacé par
`"jscpp"`. Le label `"C11 · jscpp"` (L482) intentionnellement préservé
car il ne mentionne pas "CDN" — l'harmonisation des formats de labels
est tracée séparément (à voir dans une PR UI dédiée).

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

## Production NODE_ENV mismatch (CSP)

En production sur www.cyberlearn.fr, le middleware sert la branche
CSP `isDev` (unsafe-eval + unsafe-inline) au lieu de la branche prod
(nonce + strict-dynamic). Indique que `process.env.NODE_ENV` n'est
pas `"production"` en prod — probablement une env var Vercel mal
configurée ou un build mode incorrect.

Impact : pas un bypass de sécurité direct, mais une réduction de la
protection CSP en prod (XSS plus exposable, pas de nonce strict).
À traiter en PR séparée : investiguer la config Vercel et restaurer
la branche prod CSP.

Surfacé lors du fix wasm-unsafe-eval (PR C.3).

**RESOLVED** (PR #3 deploy) — Vérification post-merge le 18/05/2026 :
la CSP prod retourne maintenant `'nonce-...' 'strict-dynamic'` (branche
prod du middleware). L'anomalie était probablement une stale config sur
l'ancien deploy Vercel — résolue par effet de bord du redeploy de PR C.3.
