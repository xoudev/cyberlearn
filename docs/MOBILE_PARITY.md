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
  dix-sept : `avatar`, `ban/acknowledge`, `ban/appeal`, `exam`, `exam/claim`,
  `exam/start`, `exam/submit`, `leaderboard`, `loadout`, `my-class`,
  `password`, `progress`, `quiz-answer`, `quiz-report`, `rating`, `review`,
  `send-otp`.
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
| Catalogue de leçons + lecture d'une leçon | ✅ | ✅ |
| Quiz d'une leçon : une seule réponse, correction, note sur la carte (`3/5`), options dans un ordre propre à chaque apprenant (le même sur les deux), « Signaler cette question » | ✅ | ✅ |
| Noter un parcours (dès une première mission terminée), moyenne affichée | ✅ | ✅ |
| Tableau de bord autour des parcours : le parcours en tête (même classement, `@cyberlearn/lib/dashboard/featured-paths`) avec sa progression et la prochaine mission, la leçon en cours, les révisions dues, puis les quatre chiffres (mêmes libellés, `dashboard/stats`) ; sections numérotées qui se referment quand l'une est vide (`dashboard/sections`) | ✅ | ✅ (onglet Accueil) |
| Parcours + page d'un parcours | ✅ | ✅ |
| Examen final d'un parcours : règles, 30 minutes chronométrées, reprise d'une tentative en cours, délai de 48 h, correction détaillée, certificat à la réussite ; certificat réclamé sur un parcours sans examen (même service, `apps/web/lib/exam/exam-service.ts` et `lib/certificates/claim.ts`) | ✅ | ✅ |
| Révisions (SM-2) : file du jour, notation Oublié / Difficile / Facile, XP ; l'interrupteur `spacedRepetition` se règle et s'applique des deux côtés | ✅ | ✅ |
| Trouver mon parcours : deux questions, deux ou trois parcours suggérés avec leur raison (`/paths/guide`, `app/paths/guide.tsx`, même classement `@cyberlearn/lib/paths/suggest`) | ✅ | ✅ |
| Profil, progression, XP, niveau | ✅ | ✅ |
| Classement + ligue | ✅ | ✅ |
| Bloc-notes | ✅ | ✅ |
| Casier (cosmétiques) | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Certificats | ✅ | ✅ |
| Badges | ✅ | ✅ (sous-onglet de Profil) |
| Réglages, sécurité | ✅ | ✅ |
| **Ma classe — côté élève** (travail donné, dates) | ✅ | ✅ |
| Avatar : glyphe, image intégrée, photo envoyée | ✅ | ✅ |
| Compte banni : un seul écran (motif, date, durée), l'avis marqué comme vu, l'appel | ✅ (`/banned`) | ✅ (`app/banned.tsx`) |

### Encore dû

Par ordre de valeur pour quelqu'un qui n'a que son téléphone.

| Surface | Pourquoi ça compte | Bloqué par |
| --- | --- | --- |
| **Forum** | Poser une question quand on est bloqué est exactement ce qu'on fait depuis son téléphone | — |
| **Aide & demandes** (tickets + fil) | Un ticket se dépose quand on rencontre le problème, pas une fois rentré. Attention au statut : une demande résolue ou close n'accepte plus de message, et le refus vient du dépôt (`ticket.repository`), pas de l'écran — l'app affiche le refus, elle ne le décide pas | — |
| **Wrapped** | Événement annuel, partageable : le format story est fait pour un téléphone, et c'est précisément la forme que le web a prise (9 écrans, avance automatique, appui pour naviguer). Côté web ce n'est pas un onglet : une étiquette apparaît dans la barre pendant la fenêtre d'ouverture (1er décembre → 7 janvier) et ouvre une pop-up. L'app doit reprendre cette forme, pas un onglet permanent | — |
| **Modération — côté auteur** | Un blocage et une sanction arrivent par e-mail et par notification, mais la page qui les liste (`/settings/moderation`) n'existe que sur le web. Le bannissement et son appel, eux, sont dans l'app | — |
| **Amis** | Demandes, liste, et le classement entre amis sur option. Le compagnon social d'une app d'apprentissage, et il n'existe que sur le web | — |
| **Fin d'inscription** (pseudo, avatar, objectif) | L'app renvoie au site pour les trois étapes (`onboarding-required.tsx`). Le questionnaire de la troisième étape est déjà dans l'onglet Parcours ; ce qui manque, c'est de pouvoir finir son inscription sans quitter l'app | Rien |
| **Partage de note** | Le bloc-notes est des deux côtés, le partage non — ni l'envoi, ni la réception. Il manquait à ce tableau : « Bloc-notes ✅ ✅ » était vrai du carnet et faux de la fonctionnalité. Le filtre qui refuse un partage vit dans le dépôt (`note-share.repository`), donc l'app l'hériterait sans le réécrire | — |
| **Noter une leçon** | Le site demande une note à la fin de chaque leçon, l'app non : les avis ne viennent que de ceux qui lisent sur ordinateur. La route `rating` existe déjà pour les parcours, et le service `rateLessonAction` vérifie la leçon terminée ; il reste l'écran | — |

### Volontairement web-only

Chacune de ces lignes est une décision, pas une dette.

| Surface | Raison |
| --- | --- |
| **Ma classe — côté prof** (donner du travail, écrire une leçon, construire un parcours) | Ce sont des tâches où l'on s'assoit devant un clavier. L'éditeur MDX a une barre d'outils, un aperçu en deux colonnes et un guide de composants ; le constructeur de parcours est une liste qu'on réordonne à côté d'un catalogue qu'on filtre. Les porter sur un écran de téléphone donnerait une version dégradée que personne n'utiliserait |
| **Console d'administration** (`admin.cyberlearn.fr`) | Application séparée, gate ADMIN + TOTP. Hors périmètre de l'app apprenant |
| **Défis** | Le catalogue est en cours de reconstruction. À rouvrir quand les premiers défis réexistent |
| **Export RGPD, suppression de compte** | Actions irréversibles qui demandent une confirmation lue posément. Elles restent sur le web, et l'app y renvoie |
| **Remise à zéro d'une progression** | Action d'administration, sur le compte de quelqu'un d'autre. Elle vit dans la console, pas dans une app apprenant |

## Quand cette page a été écrite

Elle a été écrite parce que l'app avait pris du retard sans que personne puisse
dire de combien. Sans registre, « le mobile est en retard » est une impression ;
avec, c'est une liste qu'on peut finir.
