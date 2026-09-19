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

L'app mobile lit le site par `apps/web/app/api/mobile/*` avec un jeton bearer.
Une nouvelle surface mobile veut donc dire : une route API, une méthode dans
`apps/mobile/lib/api.ts`, un écran. Les règles d'autorisation restent dans les
dépôts (`packages/db`) — jamais réécrites côté app.

## État au 17 septembre 2026

### Sur les deux

| Surface | Web | Mobile |
| --- | --- | --- |
| Connexion, inscription, MFA, mot de passe oublié | ✅ | ✅ |
| Catalogue de leçons + lecture d'une leçon | ✅ | ✅ |
| Parcours + page d'un parcours | ✅ | ✅ |
| Profil, progression, XP, niveau | ✅ | ✅ |
| Classement + ligue | ✅ | ✅ |
| Bloc-notes | ✅ | ✅ |
| Casier (cosmétiques) | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Certificats | ✅ | ✅ |
| Réglages, sécurité | ✅ | ✅ |
| **Ma classe — côté élève** (travail donné, dates) | ✅ | ✅ |

### Encore dû

Par ordre de valeur pour quelqu'un qui n'a que son téléphone.

| Surface | Pourquoi ça compte | Bloqué par |
| --- | --- | --- |
| **Révisions** | C'est la boucle d'apprentissage principale, et elle doit respecter l'interrupteur `spacedRepetition` — un interrupteur honoré d'un côté et ignoré de l'autre n'est pas un interrupteur | PR #227 (l'interrupteur) |
| **Badges** | Gagnés sur mobile, consultables seulement sur le web | — |
| **Forum** | Poser une question quand on est bloqué est exactement ce qu'on fait depuis son téléphone | — |
| **Aide & demandes** (tickets + fil) | Un ticket se dépose quand on rencontre le problème, pas une fois rentré | — |
| **Wrapped** | Événement annuel, partageable : le format story est fait pour un téléphone. Côté web ce n'est plus un onglet mais une étiquette qui apparaît dans la barre pendant la fenêtre d'ouverture et ouvre une pop-up ; l'app devra reprendre cette forme plutôt qu'un onglet permanent | — |
| **Tableau de bord** | Aujourd'hui l'onglet Accueil ; à revoir quand le tableau de bord web sera refondu | — |

### Volontairement web-only

Chacune de ces lignes est une décision, pas une dette.

| Surface | Raison |
| --- | --- |
| **Ma classe — côté prof** (donner du travail, écrire une leçon, construire un parcours) | Ce sont des tâches où l'on s'assoit devant un clavier. L'éditeur MDX a une barre d'outils, un aperçu en deux colonnes et un guide de composants ; le constructeur de parcours est une liste qu'on réordonne à côté d'un catalogue qu'on filtre. Les porter sur un écran de téléphone donnerait une version dégradée que personne n'utiliserait |
| **Console d'administration** (`admin.cyberlearn.fr`) | Application séparée, gate ADMIN + TOTP. Hors périmètre de l'app apprenant |
| **Défis** | Le catalogue est en cours de reconstruction. À rouvrir quand les premiers défis réexistent |
| **Export RGPD, suppression de compte** | Actions irréversibles qui demandent une confirmation lue posément. Elles restent sur le web, et l'app y renvoie |

## Quand cette page a été écrite

Elle a été écrite parce que l'app avait pris du retard sans que personne puisse
dire de combien. Sans registre, « le mobile est en retard » est une impression ;
avec, c'est une liste qu'on peut finir.
