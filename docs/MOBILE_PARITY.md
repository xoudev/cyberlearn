# Parité web ↔ mobile

## La règle

> **Tout ce qui est livré sur le site doit se retrouver sur l'app mobile, sauf
> indication contraire inscrite ici.**

Une fonctionnalité web-only est une **décision**, pas un oubli. Elle n'existe que
si elle est écrite dans le tableau « Volontairement web-only » ci-dessous, avec
sa raison. Tout le reste est une dette, et vit dans « Encore dû ».

Concrètement, pour toute PR qui ajoute ou modifie une surface du site :

1. si l'app mobile a la même surface, elle change dans la même PR ;
2. sinon, la ligne correspondante de ce fichier est mise à jour — soit en
   « encore dû », soit en « web-only » avec la raison ;
3. une PR qui touche une surface partagée sans faire l'un des deux est
   incomplète.

Comment l'app lit et écrit, parce que ce paragraphe disait autre chose et que
c'est lui qu'on relit avant de commencer une surface :

- **Les lectures vont directement à Supabase**, sous RLS, depuis
  `apps/mobile/lib/queries.ts`. C'est la RLS qui autorise, pas l'app.
- **Les écritures et les actions** passent par `apps/web/app/api/mobile/*` avec
  un jeton bearer, appelées depuis `apps/mobile/lib/api.ts`. Il y en a
  quarante-quatre : `avatar`, `ban/acknowledge`, `ban/appeal`, `exam`,
  `exam/claim`, `exam/start`, `exam/submit`, `forum`, `forum/post/edit`,
  `forum/post/hide`, `forum/reply`, `forum/section`, `forum/topic`, `friends`,
  `friends/accept`, `friends/remove`, `friends/request`, `leaderboard`,
  `lesson-qa`, `lesson-qa/accept`, `lesson-qa/answer`, `lesson-qa/question`,
  `lesson-qa/upvote`, `lesson-rating`, `loadout`, `moderation`, `my-class`,
  `notes/share`, `notes/shared`, `notes/unshare`, `onboarding/avatar`,
  `onboarding/finish`, `onboarding/profile`, `password`, `profile`, `progress`,
  `quiz-answer`, `quiz-report`, `rating`, `review`, `send-otp`, `support`,
  `support/reply`, `support/ticket`.
- Le forum se lit aussi par des routes, pas sous RLS : ce qu'un lecteur voit
  (ses propres messages retirés compris) est une règle du dépôt
  (`forum.repository`), et l'avatar envoyé d'un auteur doit être signé avec la
  clé `service_role`.
- **Un compte banni ne passe pas** : `userFromBearer` fait la vérification que
  `requireRequestUser` fait sur le site, et toute route qui l'appelle refuse un
  compte banni. Seules `ban/acknowledge` et `ban/appeal` passent par
  `identityFromBearer`, qui ne la fait pas : ce sont les deux choses qu'un
  compte banni peut encore faire, comme sur `/banned`.
- Une route API n'est donc nécessaire que pour ce que la RLS ne peut pas
  servir : une écriture à valider, ou quelque chose qui réclame la clé
  `service_role` — signer un avatar privé, par exemple.

Les règles d'autorisation restent dans les dépôts (`packages/db`) et dans la
RLS — jamais réécrites côté app.

## État au 21 septembre 2026

### Sur les deux

| Surface | Web | Mobile |
| --- | --- | --- |
| Connexion, inscription, MFA, mot de passe oublié | ✅ | ✅ |
| Fin d'inscription : identifiant, nom affiché et bio, avatar parmi les huit du site, puis les deux questions et les parcours suggérés (ou « Passer, j'explore seul ») ; même service (`apps/web/lib/onboarding/steps.ts`), mêmes avatars (`@cyberlearn/lib/onboarding/avatars`), reprise à la bonne étape comme sur le site | ✅ | ✅ (`app/onboarding.tsx`) |
| Catalogue de leçons + lecture d'une leçon | ✅ | ✅ |
| Quiz d'une leçon : une seule réponse, correction, note sur la carte (`3/5`), options dans un ordre propre à chaque apprenant (le même sur les deux), « Signaler cette question » | ✅ | ✅ |
| Noter un parcours (dès une première mission terminée), moyenne affichée | ✅ | ✅ |
| Noter une leçon terminée (note et commentaire), moyenne affichée ; questions-réponses sous une leçon : poser une question, répondre, accepter une réponse à sa propre question, voter pour celle d'un autre, même modération automatique et même message « retenu » (même service, `apps/web/lib/lessons/rate-lesson.ts` et `lib/lessons/qa.ts`) | ✅ | ✅ |
| Tableau de bord autour des parcours : le parcours en tête (même classement, `@cyberlearn/lib/dashboard/featured-paths`) avec sa progression et la prochaine mission, la leçon en cours, les révisions dues, puis les quatre chiffres (mêmes libellés, `dashboard/stats`) ; sections numérotées qui se referment quand l'une est vide (`dashboard/sections`) | ✅ | ✅ (onglet Accueil) |
| Parcours + page d'un parcours | ✅ | ✅ |
| Examen final d'un parcours : règles, 30 minutes chronométrées, reprise d'une tentative en cours, délai de 48 h, correction détaillée, certificat à la réussite ; certificat réclamé sur un parcours sans examen (même service, `apps/web/lib/exam/exam-service.ts` et `lib/certificates/claim.ts`) | ✅ | ✅ |
| Révisions (SM-2) : file du jour, notation Oublié / Difficile / Facile, XP ; l'interrupteur `spacedRepetition` se règle et s'applique des deux côtés | ✅ | ✅ |
| Trouver mon parcours : deux questions, deux ou trois parcours suggérés avec leur raison (`/paths/guide`, `app/paths/guide.tsx`, même classement `@cyberlearn/lib/paths/suggest`) | ✅ | ✅ |
| Profil, progression, XP, niveau | ✅ | ✅ |
| Classement + ligue | ✅ | ✅ |
| Amis : demandes reçues et envoyées, liste, accepter, refuser, annuler, retirer, personne prévenu d'un refus (même service, `apps/web/lib/friends/friends-service.ts`) ; le profil de quelqu'un et son bouton d'ami (mêmes libellés et mêmes transitions, `@cyberlearn/lib/social/friendship`), fermé à un inconnu quand il est privé, comme `/u/[username]` ; classement entre amis, sans ligne anonyme | ✅ | ✅ (`app/friends.tsx`, `app/u/[username].tsx`, onglet « Amis » du classement) |
| Confidentialité : visibilité dans le classement public (masqué, anonyme, public), visible par mes amis, profil public | ✅ (`/settings/privacy`) | ✅ (Réglages) |
| Bloc-notes ; partager une note avec sa classe ou ses amis (même liste, même modération : un refus nommé, l'auteur et ses professeurs prévenus, même service `apps/web/lib/notes/note-share.ts`), la reprendre ; les notes reçues, en lecture seule (même aperçu, `@cyberlearn/lib/notes/preview`) | ✅ | ✅ |
| Casier (cosmétiques) | ✅ | ✅ |
| Notifications ; une notification liée à un sujet, une leçon, un parcours, un profil (demande d'ami) ou au bloc-notes ouvre l'écran correspondant | ✅ | ✅ |
| Forum : sections, derniers messages, sujets par page, ouvrir un sujet, répondre, modifier et retirer son message (un administrateur retire n'importe lequel), même modération automatique et même message « retenu » ; le markdown est découpé par le même module (`@cyberlearn/lib/markdown/note-markdown`) | ✅ | ✅ |
| Certificats | ✅ | ✅ |
| Badges | ✅ | ✅ (sous-onglet de Profil) |
| Réglages, sécurité | ✅ | ✅ |
| **Ma classe — côté élève** (travail donné, dates) | ✅ | ✅ |
| Avatar : glyphe, image intégrée, photo envoyée | ✅ | ✅ |
| Aide & demandes : déposer une demande (mêmes thèmes, même liste pour un établissement, même limite de débit, réponse à l'adresse du compte), la liste, le fil et la réponse ; une demande résolue ou close n'accepte plus de message, et le refus vient du dépôt (`ticket.repository`, envoyé à l'app en `acceptsReplies`) | ✅ | ✅ |
| Compte banni : un seul écran (motif, date, durée), l'avis marqué comme vu, l'appel | ✅ (`/banned`) | ✅ (`app/banned.tsx`) |
| Modération côté auteur : ce qui a été signalé, où, quand et ce qu'il en est advenu, sans score ni règle (mêmes mots, `@cyberlearn/lib/moderation/record`) ; les avis de modération y mènent | ✅ (`/settings/moderation`) | ✅ (`app/moderation.tsx`) |

### Encore dû

Par ordre de valeur pour quelqu'un qui n'a que son téléphone.

| Surface | Pourquoi ça compte | Bloqué par |
| --- | --- | --- |
| **Wrapped** | Événement annuel, partageable : le format story est fait pour un téléphone, et c'est précisément la forme que le web a prise (9 écrans, avance automatique, appui pour naviguer). Côté web ce n'est pas un onglet : une étiquette apparaît dans la barre pendant la fenêtre d'ouverture (1er décembre → 7 janvier) et ouvre une pop-up. L'app doit reprendre cette forme, pas un onglet permanent | — |
| **Test de positionnement** | Proposé à la fin de l'inscription à qui dit avoir déjà une base, pour sauter les leçons déjà maîtrisées. L'app termine l'inscription sans lui ; il reste sur le site (`/onboarding/placement-test`) | — |
| **Envoyer une photo d'avatar** | Le site accepte une photo (recadrée, 2 Mo au plus) à l'étape avatar et dans les réglages ; l'app l'affiche mais ne sait pas en envoyer. Choisir une image sur le téléphone demande une dépendance (`expo-image-picker`) qui n'est pas dans le projet | Accord sur la dépendance |

### Volontairement web-only

Chacune de ces lignes est une décision, pas une dette.

| Surface | Raison |
| --- | --- |
| **Ma classe — côté prof** (donner du travail, écrire une leçon, construire un parcours) | Ce sont des tâches où l'on s'assoit devant un clavier. L'éditeur MDX a une barre d'outils, un aperçu en deux colonnes et un guide de composants ; le constructeur de parcours est une liste qu'on réordonne à côté d'un catalogue qu'on filtre. Les porter sur un écran de téléphone donnerait une version dégradée que personne n'utiliserait |
| **Console d'administration** (`admin.cyberlearn.fr`) | Application séparée, gate ADMIN + TOTP. Hors périmètre de l'app apprenant |
| **Défis** | Le catalogue est en cours de reconstruction. À rouvrir quand les premiers défis réexistent |
| **Export RGPD, suppression de compte** | Actions irréversibles qui demandent une confirmation lue posément. Elles restent sur le web, et l'app y renvoie |
| **Épingler ou fermer un sujet du forum** | Geste de modération réservé aux administrateurs, fait depuis le site. L'app affiche l'état (« Épinglé », « Fermé ») et refuse une réponse dans un sujet fermé, comme le site |
| **Remise à zéro d'une progression** | Action d'administration, sur le compte de quelqu'un d'autre. Elle vit dans la console, pas dans une app apprenant |

## Quand cette page a été écrite

Elle a été écrite parce que l'app avait pris du retard sans que personne puisse
dire de combien. Sans registre, « le mobile est en retard » est une impression ;
avec, c'est une liste qu'on peut finir.
