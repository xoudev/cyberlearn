# Known Issues - Hardening v1

Tracking des limitations connues introduites pendant le hardening,
à adresser dans des PRs ultérieures.

## main build regression (resolved on C.3)

Avant la PR C.3, main avait une régression latente : depuis le
cleanup des compiled artifacts (PR 1 fix), les apps ne pouvaient
pas être buildées from-scratch - résolution des imports `'./prisma.js'`
cassée. Le cache turbo masquait le problème puisque rien n'avait
forcé un rebuild entre le cleanup et la PR C.3.

### Analyse du root cause

`@cyberlearn/db` utilise NodeNext module resolution : les imports
internes ont des extensions `.js` explicites (`import './prisma.js'`).
Sur un checkout CI sans artifacts compilés, webpack cherche
`prisma.js` littéralement et échoue - même avec `transpilePackages`
qui indique à Next.js de traiter le package, mais pas à webpack
comment résoudre les extensions.

### Fix : deux couches complémentaires

**Couche 1 - `transpilePackages`** (commit `0c71994`) :
Ajoute `@cyberlearn/db` (et `@cyberlearn/email` sur admin) à
`transpilePackages` dans les deux `next.config.ts`. Nécessaire
pour que Next.js inclue les packages workspace dans son pipeline
de compilation. Seul, insuffisant : CI continuait à échouer.

**Couche 2 - `extensionAlias`** (commit `8cc36a5`) :
```typescript
webpack: (config) => {
  // CRITICAL - ne pas retirer (voir ci-dessous)
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

## C.3 - expectedOutput exposé dans le DOM (by design)

Le composant code-playground.tsx (L588) affiche expectedOutput en
clair dans le DOM ("Sortie attendue : {expectedOutput}"). Pour les
challenges actuels (type "écris du code qui produit cette sortie"),
c'est by design - la sortie attendue fait partie de l'énoncé.

Si on ajoute des challenges où la sortie doit être devinée (mot
de passe, hash, etc.), à reconsidérer : ne pas rendre
expectedOutput dans le DOM, comparer côté serveur uniquement.

Surfacé par /security-review sur C.3 - pas un bug v1, mais à
garder en tête.

## E.1 - script-src 'unsafe-eval' requis par JSCPP

La CSP appliquée aux workers (`/workers/:path*` et `/runtimes/:path*`
via `next.config.ts headers()`) doit inclure `'unsafe-eval'` parce que
JSCPP, l'interpréteur C utilisé pour les leçons C/C++, parse et
exécute du code C via `eval()` JavaScript en interne.

Discovery : pendant les tests E.1, "call to eval() blocked by CSP"
retourné par JSCPP au runtime.

Sécu pas significativement dégradée : le worker est isolé (pas de
DOM, pas de fetch, pas de cookies, pas de localStorage). `'unsafe-eval'`
augmente la surface d'attaque XSS uniquement si du code arbitraire
externe peut s'exécuter dans le worker - bloqué par `script-src 'self'`
qui interdit tout script externe.

Tracé pour une éventuelle PR future de remplacement de JSCPP par
un compilateur C en WASM pur (Emception, etc.) qui n'aurait pas
besoin de `'unsafe-eval'`.

Surfacé pendant E.1 (test 5-ter).

## E.2 - worker-src blob: requis par Monaco

`worker-src 'self' blob:` dans `middleware.ts` ne peut pas être réduit
à `worker-src 'self'` sans casser Monaco Editor. `@monaco-editor/react`
charge ses language server workers (TypeScript, JSON, CSS) via blob
URLs générées par webpack - comportement par défaut sans
`MonacoEnvironment` override.

Le retrait de `blob:` nécessiterait soit :
- un `MonacoEnvironment.getWorker()` custom pointant sur des fichiers
  statiques servis depuis `/workers/` (bundler config non triviale)
- ou le remplacement de Monaco par un éditeur sans blob workers

Tracé pour une PR dédiée (E.4 ou Phase 2 Monaco polish).

Surfacé pendant E.2 (audit confirmé : pas de `MonacoEnvironment` custom
dans le code applicatif, donc comportement par défaut blob: actif).

## D - asm worker hors scope hardening v1

L'asm worker (`apps/web/app/(app)/lessons/[slug]/_workers/asm.worker.ts`
ou équivalent) est couvert structurellement par `invalidateWorker(language)`
dans `code-playground.tsx` - un timeout sur une leçon ASM terminera et
invalidera correctement le singleton `asmWorker`. Mais le worker lui-même
n'est pas encore fonctionnel en v1 (aucune leçon ASM publiée, runtime
non configuré). Test manuel impossible à ce stade. À valider quand
l'asm worker sera activé.

Surfacé pendant D.

## C.5 - Labels UI mentionnant "CDN" mais chargement local

`code-playground.tsx` contient encore deux labels UI qui mentionnent
"CDN" alors que JSCPP est désormais bundlé localement depuis C.4 :
- L192 : `badge: "jscpp · CDN"`
- L482 : `"C11 · jscpp"`

Pas un bug fonctionnel, mais le label "CDN" est trompeur pour
l'utilisateur depuis C.4. À corriger en C.5 (cleanup final
`code-playground.tsx`).

Surfacé pendant C.4.

**RESOLVED** (PR C.5 - chore/code-playground-cleanup, 2026-05-19)
Le label `"jscpp · CDN"` (L192 de code-playground.tsx) remplacé par
`"jscpp"`. Le label `"C11 · jscpp"` (L482) intentionnellement préservé
car il ne mentionne pas "CDN" - l'harmonisation des formats de labels
est tracée séparément (à voir dans une PR UI dédiée).

## C.2 - Dispatch par shape dans py-runner.js

Le worker partagé `apps/web/public/workers/py-runner.js` dispatche
entre run mode et test mode via `Array.isArray(tests)`. Si on ajoute
un 3e mode d'usage Python, refactorer en dispatch explicite par
champ `type` pour éviter une ambiguïté de shape.

## C.1 - JSCPP bundle pushé hors branch protection

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
pas `"production"` en prod - probablement une env var Vercel mal
configurée ou un build mode incorrect.

Impact : pas un bypass de sécurité direct, mais une réduction de la
protection CSP en prod (XSS plus exposable, pas de nonce strict).
À traiter en PR séparée : investiguer la config Vercel et restaurer
la branche prod CSP.

Surfacé lors du fix wasm-unsafe-eval (PR C.3).

**RESOLVED** (PR #3 deploy) - Vérification post-merge le 18/05/2026 :
la CSP prod retourne maintenant `'nonce-...' 'strict-dynamic'` (branche
prod du middleware). L'anomalie était probablement une stale config sur
l'ancien deploy Vercel - résolue par effet de bord du redeploy de PR C.3.

## Suites vertes qui ne testaient pas le code (2026-09)

Deux défauts trouvés à quelques jours d'intervalle, de forme identique :
`pnpm test` passait, et ce qu'il lisait n'était pas les sources. Ils sont
corrigés tous les deux ; l'entrée existe parce que la forme se reproduira.

### 1. Des `.js` compilés devant les `.ts` (PR #255)

Symptôme : une modification du sujet des e-mails n'avait **aucun effet sur son
propre test**. Cause : Vite résout `.js` avant `.ts`, et 348 artefacts compilés
traînaient à côté des sources dans `packages/email`, `packages/lib`,
`packages/types` et `packages/ui`. Chaque `import "./subject.js"` atteignait
le dernier build, pas le fichier édité.

`packages/db` documentait déjà exactement ce piège et s'en protégeait avec
`"noEmit": true` plus une règle `.gitignore`. Les quatre autres packages ne
l'avaient jamais eu. Fix : `noEmit` sur les quatre tsconfig, garde `.gitignore`
étendue aux cinq packages, 348 fichiers supprimés.

Détection : si un test ne réagit pas à l'édition de son sujet, chercher un
`.js` à côté du `.ts` avant de soupçonner le test.

### 2. `test.inputs` de turbo ne couvrait pas le code (PR #251)

Symptôme : quatre fichiers modifiés et committés, et turbo servait le même hash
(`6a8df5686bfc7531`) avec 261 tests au lieu de 268. Cause : la tâche `test` de
`turbo.json` listait `src/**` et `test/**` en `inputs`, et ni `apps/web` ni
`apps/admin` n'a l'un de ces dossiers — leurs tests vivent à côté du code, dans
`app/**` et `lib/**`. Le hash de test ignorait donc toute modification de
source, et la CI, qui restaure `.turbo` d'un commit au suivant, pouvait rejouer
les logs d'un ancien run comme un succès.

Fix : `"inputs": ["$TURBO_DEFAULT$"]`. Règle générale : ne restreindre les
`inputs` d'une tâche que si on peut prouver que la liste couvre l'endroit où le
code vit réellement, dans **chaque** workspace où la tâche tourne.

## Variables Jira déclarées et inutilisées

`JIRA_BASE_URL`, `JIRA_API_EMAIL`, `JIRA_API_TOKEN` et `JIRA_PROJECT_KEY` sont
déclarées (optionnelles) dans `apps/web/lib/env.ts` et dans `.env.example`.
Aucun code ne les lit : le formulaire de contact écrit un `ContactTicket` en
base et la console y répond. Le registre RGPD et la roadmap des coûts ne
nomment plus Atlassian comme sous-traitant.

**RESOLVED** (PR #260 - chore/drop-dead-jira-config)
Les quatre entrées sont retirées du schéma Zod, de son `runtimeEnv`, de
`.env.example` et de `DEPLOY.md`. Rien ne casse si elles restent définies côté
Vercel : `@t3-oss/env-nextjs` ne valide que ce qui est déclaré et ignore le
reste de l'environnement — vérifié en buildant l'app avec les quatre variables
posées dans le `.env`.

## `content/` était gitignoré alors que 210 fichiers y sont tracés

Troisième exemplaire de la même forme que les deux précédents : une règle qui
prétend décrire l'état du dépôt, et qui décrit l'état d'il y a un an.

`.gitignore` portait `content/`, sous un commentaire disant que les leçons MDX
sont écrites en local et « ne sont pas tracées dans le dépôt ». Elles le sont :
210 fichiers, soit 192 leçons, 16 quiz d'examen final et deux README, dont
`content/README.md` qui appelle le dossier la source de vérité du catalogue.

Git n'ignore rien de ce qu'il trace déjà, donc la règle n'a jamais touché ces
210 fichiers. Elle faisait exactement une chose : faire disparaître
silencieusement toute leçon **nouvelle** d'un `git add`. Elle n'avait pas encore
mordu parce qu'aucune leçon n'avait été ajoutée depuis — au moment de la
découverte, `git status --ignored content` ne montrait rien de non tracé.

Découvert de biais : `lint-staged` a échoué sur « The following paths are
ignored by one of your .gitignore files: content » en réappliquant ses
modifications de formatage.

Le dépôt portait déjà la leçon, trois lignes au-dessus, dans le commentaire de
garde laissé par la PR #66 après le même accident sur `/docs`. Fix : la règle
est retirée, et le commentaire de garde couvre maintenant les deux dossiers.

Règle générale : une règle `.gitignore` sur un dossier partiellement tracé est
toujours un piège. Le symptôme n'est pas une erreur, c'est un fichier qui
n'apparaît pas — et personne ne cherche ce qui ne s'affiche pas.

## Alertes Dependabot restantes après la mise à jour du 26 septembre 2026

Next.js est passé de 15.5.15 à 15.5.26. La 15.5.15 portait deux alertes
critiques, dont une exécution de code à distance sans authentification par
l'API d'optimisation d'images (fichiers AVIF). Le site en production tournait
sur cette version. Vitest est passé à 3.2.7, pour une lecture de fichiers
arbitraires par l'interface web de Vitest. Les dépendances indirectes signalées
ont été montées à leur version corrigée dans les plages déjà déclarées : xmldom,
brace-expansion, js-yaml, postcss, vite, ws, fast-uri, browserslist et sharp.

Trois restent ouvertes, et aucune n'est exécutée par le site en ligne :

- **`postcss@8.4.31`**, figé par Next lui-même (dépendance exacte du compilateur
  CSS de Next). Il ne traite que les feuilles de style du dépôt, au build, pas
  des entrées d'utilisateurs. Il partira avec une version de Next qui le relève.
- **`image-size@1.2.1`**, tiré par Metro (le bundler de l'app mobile). Le
  correctif n'existe qu'en 2.x, que Metro n'accepte pas encore. Il ne lit que
  les images du dépôt pendant le bundling.
- **`deepmerge-ts@7.1.5`**, tiré par `@prisma/config`. Le correctif est en 8.x.
  Il ne fusionne que la configuration Prisma du dépôt, en local et en CI.

À réexaminer quand Next, Expo ou Prisma publient une version qui relève ces
dépendances ; ne pas les forcer par un `overrides`, qui ferait tourner Metro ou
Prisma sur une version majeure qu'ils n'ont pas testée.
