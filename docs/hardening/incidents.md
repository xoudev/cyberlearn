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

## 2026-09-24 - Quatre tables d'apprentissage écrites par les clients

### Constat

Relevé en portant les révisions dans l'app mobile. La baseline RLS
(`20260610200000_rls_baseline`) donnait à quatre tables une policy `FOR ALL`
sur les lignes du lecteur, et aucune migration n'avait repris les droits
d'écriture. Via l'API de données, avec la clé publique et sa propre session,
un apprenant pouvait :

- `review_schedules` : remettre une révision dans le passé puis la noter à
  nouveau, un dixième de l'XP de la leçon à chaque fois ; ou créer une révision
  pour une leçon jamais étudiée ;
- `user_skip_waivers` : lever les prérequis de n'importe quelle leçon et ouvrir
  ce qu'un parcours garde verrouillé ;
- `user_placement_results` : écrire ses propres scores de positionnement ;
- `user_path_progress` : marquer un parcours commencé ou terminé.

Aucun client n'écrit dans ces tables : le site et l'app passent par le serveur
(Prisma). Aucune trace d'exploitation n'a été cherchée ; les XP de type REVIEW
anormalement élevées seraient le premier signe.

### Correctif

Migration `20260924190000_server_written_learning_tables` : chaque table garde
la lecture de ses propres lignes (policy `FOR SELECT`), perd toute écriture, et
les droits de colonne sont réduits à `SELECT` pour `authenticated`, comme les
tables durcies par `20260725000000_rls_column_hardening`. Vérifié sur une base
locale avec les droits par défaut de Supabase : `UPDATE 1` avant, `permission
denied` après. Tests ajoutés à `rls.integration.test.ts`.

### Règle

Une table écrite seulement par le serveur n'a pas de policy d'écriture, et
`authenticated` n'y a que `SELECT`. `notifications` (marquer comme lu) et
`user_preferences` restent écrites par l'app, et le sont légitimement.

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
