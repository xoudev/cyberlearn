# Audit RGPD initial — Cyber Learn

Date : 2026-05-23
Methodologie : audit automatise du codebase (grep/find sur apps/, packages/, schema.prisma,
.env.example) + lecture directe des fichiers identifies.

---

## 1. Analytics / tracking

**Statut : ABSENT**

Recherche exhaustive (`posthog`, `plausible`, `google-analytics`, `gtag`, `mixpanel`, `segment`,
`hotjar`, `matomo`, `amplitude`, `datadog-rum`, `cloudflare-analytics`) dans les fichiers TypeScript,
JavaScript, JSON et les `package.json` de tous les workspaces.

Aucun hit. La plateforme ne transmet aucune donnee de navigation a un tiers analytique.

**Consequence RGPD :** pas de cookie de tracking, pas de consentement requis au titre de l'ePrivacy
pour cette categorie. La banniere cookie actuelle est donc en avance sur le besoin reel.

---

## 2. Observability avec PII

**Statut : DEPENDANCE PRESENTE, NON INITIALISEE**

- `@sentry/nextjs` figure dans `apps/web/package.json` et `apps/admin/package.json` (catalog Turborepo).
- `SENTRY_DSN` et `SENTRY_AUTH_TOKEN` sont documentes dans `.env.example`.
- Aucun fichier d'initialisation (`instrumentation.ts`, `sentry.client.config.ts`,
  `sentry.server.config.ts`) n'existe dans le codebase. Aucun appel `Sentry.*` dans le code applicatif.

**Conclusion :** Sentry est catalogue mais inactif. Aucune donnee n'est transmise actuellement.

**A surveiller :** si Sentry est active ulterieurement, il peut capturer des stack traces contenant des
donnees personnelles (emails dans les parametres de fonction, tokens, etc.) et eventuellement des session
replays. Il faudra alors : signer un DPA Sentry, activer le scrubbing PII, et mettre a jour la page
Politique de confidentialite.

---

## 3. Cookie consent

**Statut : MECANISME BINAIRE EXISTANT, SANS GATING ACTIF**

### Composant

`apps/web/components/cookie-banner.tsx` — banniere fixee en bas de page, cote client (`"use client"`).

### Flow complet

1. **Lecture serveur** : `apps/web/app/layout.tsx:38` lit `cookieStore.get("cl_consent")` et passe la
   valeur a `<CookieBanner initialConsent={...} />` pour eviter un flash au revisit.
2. **Affichage** : la banniere s'affiche si `initialConsent` est absent (premiere visite ou cookie expire).
3. **Set cote client** : clic ACCEPTER ou REFUSER appelle `setConsentCookie("accepted"|"rejected")` via
   `document.cookie`.

### Caracteristiques du cookie `cl_consent`

| Attribut   | Valeur                          | Commentaire                                 |
|------------|---------------------------------|---------------------------------------------|
| Nom        | `cl_consent`                    |                                             |
| Valeurs    | `"accepted"` ou `"rejected"`    | Granularite binaire                         |
| Max-age    | 365 jours                       |                                             |
| Path       | `/`                             |                                             |
| SameSite   | `Lax`                           |                                             |
| Secure     | absent                          | Non critique : cookie non sensible, lu JS   |
| HttpOnly   | absent                          | Intentionnel : lecture JS necessaire        |

### Gating

**Rien n'est actuellement gate par ce consentement.** Coherent car il n'y a ni analytics (Q1), ni
Sentry actif (Q2). La banniere informe l'utilisateur de l'existence de cookies strictement necessaires
(authentification, preferences) — aucun service opt-in a activer.

### Contenu de la banniere (texte actuel)

> "Ce site utilise des cookies strictement necessaires a son fonctionnement (authentification,
> preferences). Aucun cookie publicitaire."

Lien : `/legal/cgu#cookies`

---

## 4. Donnees stockees

### Modele `User` (`packages/db/prisma/schema.prisma`)

| Champ          | Type                | Finalite                                     | Sensibilite |
|----------------|---------------------|----------------------------------------------|-------------|
| `id`           | UUID                | Cle primaire, lien Supabase auth             | Faible      |
| `email`        | String unique       | Identifiant de connexion (Magic Link)        | **Elevee**  |
| `username`     | VarChar(32)?        | Pseudo public (choisi en onboarding)         | Moyenne     |
| `displayName`  | VarChar(64)         | Nom affiche                                  | Moyenne     |
| `avatarUrl`    | String?             | URL avatar (GitHub OAuth ou upload)          | Faible      |
| `bio`          | VarChar(280)?       | Bio publique optionnelle                     | Faible      |
| `role`         | UserRole            | STUDENT/ADMIN — controle d'acces             | Moyenne     |
| `xpTotal`      | Int                 | Gamification                                 | Faible      |
| `level`        | Int                 | Gamification                                 | Faible      |
| `streakDays`   | Int                 | Gamification                                 | Faible      |
| `lastActiveAt` | DateTime            | Dernier acces (streaks, crons)               | Moyenne     |
| `createdAt`    | DateTime            | Date d'inscription                           | Faible      |

### Modele `UserPreferences`

Preferences non sensibles : theme, locale, flags email-notifications, publicProfile.

### Modele `ContactTicket`

| Champ        | Stocke ?        | Commentaire                                              |
|--------------|-----------------|----------------------------------------------------------|
| `email`      | **Oui**         | Email saisi dans le formulaire (peut etre different de l'email de compte) |
| `message`    | **Oui (Text)**  | Contenu libre — peut contenir des donnees personnelles   |
| `subject`    | Oui             | VarChar(200)                                             |
| `ipAddress`  | **Non** (NULL)  | Champ existe dans schema (`// SHA-256 hashed (GDPR)`) mais le code `submitContactAction` ne le peuple pas actuellement |
| `userAgent`  | **Non** (NULL)  | Meme situation                                           |

### Modele `AuditLog`

| Champ        | Valeur stockee       | Commentaire                                   |
|--------------|----------------------|-----------------------------------------------|
| `ipAddress`  | SHA-256 + IP_SALT    | Pseudonymise par schema design                |
| `userAgent`  | VarChar(500)         | Stocke en clair — navigateur/OS, pas de PII directe |
| `actorId`    | UUID reference User  | Indirectement identifiant                     |

### Autres modeles avec user-generated content

- `LessonQuestion` / `LessonAnswer` : contenu poste par les utilisateurs dans les Q&A de lecons
- `Certificate` : prenom/nom affiche, date, lecons completees
- `ReviewSchedule` : planning SM-2 (donnees d'apprentissage)
- `UserPlacementResult` : scores par categorie

**Durees de conservation : non definies dans le code.** A definir et a documenter dans la PP.

---

## 5. Footer

**Statut : PARTIEL**

Composant : `apps/web/components/footer.tsx`

### Liens presents

| Lien                     | URL             |
|--------------------------|-----------------|
| Contact                  | `/contact`      |
| Verifier un certificat   | `/verify`       |
| CGU                      | `/legal/cgu`    |
| CGV                      | `/legal/cgv`    |

### Liens absents (requis RGPD)

| Lien manquant                  | Statut           |
|--------------------------------|------------------|
| Politique de confidentialite   | Page inexistante |
| Mentions legales               | Page inexistante |
| Gestion des cookies            | Absent           |

---

## 6. Sous-traitants

Detection : `package.json` de tous les workspaces + `.env.example`.

| Sous-traitant           | Service                                    | Region           | DPA confirme |
|-------------------------|--------------------------------------------|------------------|--------------|
| **Supabase**            | BDD Postgres, Auth, Storage, Realtime      | eu-central-1 (DE)| A verifier   |
| **Vercel**              | Hebergement web, serverless, cron          | Multi-region     | A verifier   |
| **Resend**              | Emails transactionnels                     | US               | A verifier   |
| **Upstash Redis**       | Rate limiting (cles pseudonymisees)        | EU disponible    | A verifier   |
| **Cloudflare Turnstile**| Captcha formulaire contact                 | Global           | A verifier   |
| **Sentry**              | Monitoring erreurs (NON ACTIVE)            | US/EU            | Non requis pour l'instant |
| **Jira (Atlassian)**    | Ticketing contact (email + message)        | US/EU Cloud      | A verifier   |

Note : Cloudflare Turnstile est configure (env var presente) mais l'implementation cote serveur
n'est pas finalisee — le commentaire dans `contact-actions.ts:45` indique "added in a future phase".

---

## 7. Region Supabase

URL Supabase (source : `.env.local`) :
```
https://dzxjspfarvprzxjuukpt.supabase.co
```

URL du pooler (confirme la region) :
```
aws-1-eu-central-1.pooler.supabase.com
```

**Region : eu-central-1 — Francfort, Allemagne (UE)**

Toutes les donnees personnelles stockees dans Supabase Postgres restent dans l'UE. Conforme
RGPD Art. 44 (pas de transfert hors EEE pour ce sous-traitant).

---

## 8. Logging IP / User-Agent

| Endpoint                                      | IP lue | Stockage IP          | UA lu | Stockage UA |
|-----------------------------------------------|--------|----------------------|-------|-------------|
| `app/(auth)/login/actions.ts:34`              | Oui    | Redis (pseudonymise) | Non   | N/A         |
| `app/contact/_actions/contact-actions.ts:44`  | Oui    | Redis (pseudonymise) | Non   | N/A — champ existe dans schema mais non peuple |
| `lib/rate-limit.ts` (general)                 | Oui    | Redis (pseudonymise) | Non   | N/A         |
| `admin/lib/rate-limit.ts`                     | Oui    | Redis (pseudonymise) | Non   | N/A         |

**Methode de pseudonymisation :** HMAC-SHA256 avec `IP_SALT` (>= 32 chars, requis en prod via
`env.ts`). Implementation dans `apps/web/lib/rate-limit.ts:pseudonymize()`.

**Aucune IP ou User-Agent n'est logue en clair dans les fichiers de log ou en base.**

---

## Gaps identifies (a resoudre dans PR 2.x)

### Obligatoires (non-conformite RGPD directe)

1. **Page Politique de confidentialite manquante** (`/legal/privacy`) — Art. 13 RGPD : information
   des personnes au moment de la collecte. Doit couvrir : donnees collectees, finalites, sous-traitants,
   durees de conservation, droits des personnes, DPO ou point de contact.

2. **Mentions legales manquantes** — obligation legale francaise (LCEN Art. 6). Doit contenir :
   editeur, hebergeur, directeur de publication.

3. **Footer : lien Politique de confidentialite absent** — requis pour que les utilisateurs
   puissent y acceder facilement (CNIL recommandation).

4. **Durees de conservation non definies** — Art. 5(1)(e) RGPD (limitation de conservation).
   A definir au minimum pour : User (jusqu'a suppression), ContactTicket, AuditLog, ReviewSchedule.

5. **Droit a l'effacement (Art. 17) non implemente** — pas de route "Supprimer mon compte".
   Suppression Supabase auth.users + cascade Prisma necessaire.

### Importants (bonne pratique / risque modere)

6. **Droit a la portabilite (Art. 20) absent** — pas d'export JSON/CSV des donnees personnelles.

7. **Droit d'acces complet (Art. 15) partiel** — profil editable (username, bio, avatar) mais pas
   de vue exhaustive de toutes les donnees stockees sur l'utilisateur.

8. **DPA sous-traitants non confirmes** — Resend, Upstash, Cloudflare Turnstile, Jira : verifier
   que chaque sous-traitant a signe un DPA (Data Processing Agreement) valide ou que les SCCs
   (Standard Contractual Clauses) sont en place pour les transferts hors UE.

9. **Gestion des cookies : lien absent du footer** — bouton/lien "Gerer les cookies" permettant
   de modifier son choix ulterieurement.

### A surveiller (risque futur)

10. **Sentry : activation future** — si `SENTRY_DSN` est configure, ajouter : scrubbing PII
    (`beforeSend`), DPA Sentry, mise a jour PP.

11. **ContactTicket.ipAddress non peuple** — incoherence entre schema (champ prevu) et code (non
    implemente). Soit supprimer le champ, soit implementer le hachage (identique a rate-limit).

12. **Cloudflare Turnstile** — quand l'implementation sera finalisee, ajouter Cloudflare a la
    liste des sous-traitants dans la PP.

---

## Statut au 23/05/2026

### Gaps obligatoires — RESOLUS par PR 2.2 (feat/rgpd-pages-legales)

- Page `/privacy` (Politique de confidentialite) creee avec durées de conservation, sous-traitants, droits utilisateur, cookies.
- Page `/legal` (Mentions legales) creee : editeur non-professionnel, hebergeur Vercel, PI, droit applicable.
- Footer mis a jour : liens Confidentialite + Mentions legales ajoutes, CGV retire.
- Registre des traitements cree : `docs/rgpd/registre-traitements.md` (5 traitements documentes).
- Durees de conservation declarees dans la PP et le registre.
- Middleware mis a jour : `/legal` et `/privacy` ajoutes aux routes publiques.

### Art. 20 (portabilite) — RESOLU par PR 2.4.A (feat/rgpd-export)

- Endpoint GET /api/me/export retourne JSON exhaustif avec les donnees du user (16 modeles Prisma, AuditLog exclu).
- Rate limit 1 export par userId par 24h (sliding window Upstash, prefix "rl:export").
- AuditLog "user.data.exported" avec IP pseudonymisee (HMAC-SHA256).
- Notifications limitees aux 1000 dernieres (ordonnees par scheduledFor DESC).
- Certificats inclus avec downloadUrl + verifyUrl.
- Q&A answers enrichies avec questionTitle.
- Page /settings/data avec bouton telechargement.
- Refactor : pseudonymize() extrait dans apps/web/lib/pseudonymize.ts (etait prive dans rate-limit.ts).
- /privacy Section 7 mise a jour : mention "a venir" retiree pour l'export, conservee pour la suppression (PR 2.4.B).

### Q3 — Cookie banner — RESOLU par PR 2.3 (feat/cookie-banner-notice)

- Banner refactore en notice de transparence mono-bouton (J'AI COMPRIS).
- cl_consent valeur "acknowledged" au lieu de "accepted/rejected".
- role="region" + aria-labelledby pour a11y.
- Texte aligne sur l'article 82 de la loi Informatique et Libertes (exemption cookies strictement necessaires).
- legal/cgu/page.tsx : "cookie de consentement" corrige en "cookie de notice".
- Coherent avec Q1 (aucun analytics) et Q2 (Sentry inactif) : aucun service opt-in a activer.

### Gaps restants — traces dans docs/backlog/post-v1.md

- Droits utilisateur backend (export, suppression, anonymisation) : PR 2.4.
- Jobs de purge automatique des logs : PR 2.4 ou post-launch.
- Sentry : desinstaller ou configurer (RGPD-safe) : PR 3.
- Gestion des cookies granulaire : uniquement si analytics ajoutes (pas de delai impose).
- DPA sous-traitants (Resend, Atlassian, Upstash, Cloudflare) : a verifier + a jour Jordan.
