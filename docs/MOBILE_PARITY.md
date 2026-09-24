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
  un jeton bearer, appelées depuis `apps/mobile/lib/api.ts`. Il y en a huit :
  `avatar`, `leaderboard`, `loadout`, `my-class`, `password`, `progress`,
  `quiz-answer`, `send-otp`.
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
| Quiz d'une leçon : une seule réponse, correction, note sur la carte (`3/5`) | ✅ | ✅ |
| Parcours + page d'un parcours | ✅ | ✅ |
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

### Encore dû

Par ordre de valeur pour quelqu'un qui n'a que son téléphone.

| Surface | Pourquoi ça compte | Bloqué par |
| --- | --- | --- |
| **Révisions** | C'est la boucle d'apprentissage principale. Plus rien ne la bloque : l'interrupteur `spacedRepetition` existe depuis la PR #227 (`UserPreferences.spacedRepetition`, réglé dans `/settings/preferences`) et l'app devra le lire — un interrupteur honoré d'un côté et ignoré de l'autre n'est pas un interrupteur | — |
| **Forum** | Poser une question quand on est bloqué est exactement ce qu'on fait depuis son téléphone | — |
| **Aide & demandes** (tickets + fil) | Un ticket se dépose quand on rencontre le problème, pas une fois rentré. Attention au statut : une demande résolue ou close n'accepte plus de message, et le refus vient du dépôt (`ticket.repository`), pas de l'écran — l'app affiche le refus, elle ne le décide pas | — |
| **Wrapped** | Événement annuel, partageable : le format story est fait pour un téléphone, et c'est précisément la forme que le web a prise (9 écrans, avance automatique, appui pour naviguer). Côté web ce n'est pas un onglet : une étiquette apparaît dans la barre pendant la fenêtre d'ouverture (1er décembre → 7 janvier) et ouvre une pop-up. L'app doit reprendre cette forme, pas un onglet permanent | — |
| **Tableau de bord** | Aujourd'hui l'onglet Accueil. Le web a été refondu autour des parcours depuis (PR #233) ; l'onglet Accueil ne suit pas encore | — |
| **Modération — côté auteur** | Un blocage et une sanction arrivent par e-mail et par notification, mais la page qui les liste (`/settings/moderation`) et l'appel d'un bannissement n'existent que sur le web. Quelqu'un sanctionné sur son téléphone reçoit le motif sans pouvoir répondre | — |
| **Amis** | Demandes, liste, et le classement entre amis sur option. Le compagnon social d'une app d'apprentissage, et il n'existe que sur le web | — |
| **Partage de note** | Le bloc-notes est des deux côtés, le partage non — ni l'envoi, ni la réception. Il manquait à ce tableau : « Bloc-notes ✅ ✅ » était vrai du carnet et faux de la fonctionnalité. Le filtre qui refuse un partage vit dans le dépôt (`note-share.repository`), donc l'app l'hériterait sans le réécrire | — |

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
