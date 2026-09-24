# Production Incidents

---

## 2026-09-24 - Un compte banni restait actif dans l'app mobile

### Symptôme

Aucun signalement : trouvé en préparant le forum dans l'app. Sur le site,
`requireRequestUser` renvoie un compte banni vers `/banned`, et toutes les
actions passent par lui. Les routes `/api/mobile/*` authentifient avec
`userFromBearer`, qui vérifiait le jeton (signature, expiration, MFA) mais pas
le bannissement.

### Conséquence

Un compte banni gardait l'usage complet de l'app : terminer des leçons et
gagner de l'XP (`progress`), répondre aux quiz, noter un parcours, signaler une
question, changer son équipement. L'app ne lisait pas `user_bans` et
n'affichait rien. Le forum et les demandes d'aide, prévus dans l'app, auraient
hérité du même trou, alors qu'un bannissement vise d'abord ce qu'on publie.

### Correctif

- `userFromBearer` refuse un compte banni (`banRepository.findActive`, la
  même requête que le site). La vérification vit dans la fonction que toutes
  les routes appellent déjà : une route nouvelle ne peut pas l'oublier.
- `identityFromBearer` garde l'ancien comportement, pour les deux seules routes
  qu'un compte banni doit atteindre : `ban/acknowledge` et `ban/appeal`
  (service partagé avec `/banned`, `apps/web/lib/moderation/ban-appeal.ts`).
- L'app lit son propre bannissement (`user_bans_select_own`) au démarrage, au
  retour au premier plan et toutes les cinq minutes, et n'ouvre plus que
  `app/banned.tsx` tant qu'il est en vigueur.

### Reste

Les écritures directes sous RLS (bloc-notes, préférences, « leçon ouverte »)
ne vérifient pas le bannissement : elles ne touchent que les données du compte
lui-même, et l'app ne les propose plus une fois bannie.

---

## 2026-05-23 - Incident cascade login après merge PR 2.4.A

### Symptôme initial

"An error occurred in the Server Components render" sur /login.
Login email ET GitHub OAuth tous deux cassés en prod.

### Diagnostic - 3 causes en cascade

**Cause 1 - Upstash Redis instance supprimée**

- Module load throw : `[rate-limit] UPSTASH_REDIS_REST_URL must be set`
- Instance cyberlearn-ratelimit auto-deleted après 14j inactivité (free tier)
- Fix : Création nouvelle DB Upstash Frankfurt + env vars Vercel
- Login email refonctionne

**Cause 2 - Espace trailing dans Site URL Supabase**

- Erreur GoTrue : `parse "https://cyberlearn.fr ": invalid character " " in host name`
- Espace fantôme dans la config Supabase Auth (Site URL)
- Le parser URL crashait au callback OAuth (email n'utilise pas ce path)
- Fix : Edit Supabase Auth, URL Configuration, enlever l'espace
- Login GitHub ne crash plus mais redirige vers /

**Cause 3 - Mismatch www / sans-www**

- Site URL Supabase = `https://cyberlearn.fr` (sans www)
- Domaine canonique servi = `https://www.cyberlearn.fr` (avec www)
- Session cookie set sur cyberlearn.fr, pas accessible depuis www
- Fix : Aligner Site URL Supabase sur `https://www.cyberlearn.fr`

### Lien avec PR 2.4.A

Aucun côté code. PR 2.4.A a juste révélé les 3 bugs latents en cascade :

1. **Upstash** : seulement déclenché parce qu'on a relancé le service après 14j (free tier policy)
2. **Site URL espace** : présent depuis le copy/paste de la config, pas touché par notre PR
3. **www mismatch** : présent depuis le setup initial, pas touché par notre PR

### Leçons

- Free tier Upstash supprime après 14j inactivité, envisager keep-alive ou plan payant (tracé backlog)
- Code rate-limit doit fail-open en cas d'absence Upstash (hotfix dédié, voir ci-dessous)
- Audit config Supabase à faire (recherche espaces, vérification URLs cohérentes avec domaine canonique), tracé backlog
- Tester end-to-end (email ET OAuth) après chaque PR sécu/infra, procédure à formaliser

### Hotfix

Branche : `hotfix/rate-limit-fail-open`

Le throw module-load `[rate-limit] UPSTASH_REDIS_REST_URL must be set` casse le service si Upstash est indisponible. Rendre le limiter fail-open en prod : init Redis lazy + return `null` si env manquant + toutes les `checkXxx` return success si Redis null. `console.warn` si non configuré pour visibilité.

Fonctions concernées : `checkMagicLinkPerEmail`, `checkMagicLinkPerIp`, `checkContactForm`, `checkQaSubmission`, `checkHintReveal`, `checkDataExport`. `checkAuthRateLimit` déjà fail-open.
