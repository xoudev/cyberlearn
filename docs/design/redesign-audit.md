# Audit de couverture du rework Bastion

24 octobre 2026. Périmètre : pages produit du site web, dans la direction validée. Logo existant, carbone/craie/cuivre, Barlow Condensed et Space Grotesk, angles droits et motion brève. L’app native garde sa dette visuelle explicite dans [MOBILE_PARITY.md](../MOBILE_PARITY.md).

## Inventaire des routes

Cet inventaire couvre la phase des pages. Le [rapport complémentaire des extensions](extensions-review.md) traite les fenêtres, panneaux, e-mails, PDF, images, icônes et vidéos, ainsi que les vérifications finales ultérieures. Les chiffres de tests ci-dessous sont ceux de la phase des pages.

L’inventaire des fichiers `page.tsx` de `apps/web/app`, après retrait des aperçus temporaires, contient 64 entrées : 61 routes produit et trois outils exclus du périmètre. Ce compte décrit des modèles de routes, pas le nombre de leçons ou de profils en base. Les quatre limites d’erreur et de page introuvable ainsi que les sept sections de paramètres sont comptées séparément.

| Famille | Nombre | Routes et preuve de couverture |
| --- | --- | --- |
| Surfaces déjà refaites avant l’extension | 12 | `/`, `/dashboard`, `/paths`, `/lessons`, `/revisions`, `/review`, `/challenges`, `/notes`, `/badges`, `/certificates`, `/locker`, `/leaderboard`. [DA et captures](direction-artistique.md), [contrôle du panneau de dossiers](notes-folder-review.md). `/review` est une redirection conservée vers `/revisions`, pas une seconde session à redessiner. |
| Communauté et aide | 7 | `/forum`, `/forum/[category]`, `/forum/[category]/[topic]`, `/duels`, `/duels/[id]`, `/support`, `/support/[id]`. [Contrôles](community-review.md). |
| Profils | 2 | `/profile`, `/u/[username]`. [Contrôles du compte](account-review.md). |
| Détails d’apprentissage | 5 | `/paths/[slug]`, `/lessons/[slug]`, `/challenges/[slug]`, `/paths/[slug]/exam`, `/paths/[slug]/mock-exam`. [Parcours et leçon](learning-detail-review.md), [examens et défis](assessment-review.md). |
| Classe et rédaction | 5 | `/my-class`, `/my-class/lessons/new`, `/my-class/lessons/[id]/edit`, `/my-class/paths/new`, `/my-class/paths/[id]/edit`. [Contrôles](class-review.md). |
| Événements | 4 | `/tournaments`, `/tournaments/[id]`, `/tournaments/[id]/[slug]`, `/wrapped`. [Contrôles](events-review.md). |
| Accès et premiers pas | 11 | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/mfa`, `/onboarding`, `/onboarding/avatar`, `/onboarding/goals`, `/onboarding/placement-test`, `/onboarding/placement-test/questions`, `/onboarding/placement-test/result`. [Contrôles](access-review.md). |
| Pages publiques | 6 | `/catalogue`, `/download`, `/glossaire`, `/contact`, `/verify`, `/verify/[publicId]`. [Contrôles](public-review.md). |
| Informations et cycle du compte | 9 | `/legal`, `/legal/terms`, `/privacy`, `/banned`, `/account/delete/confirm`, `/account/delete/success`, `/account/delete/error`, `/account/keep`, `/account/keep/done`. [Contrôles](states-review.md). |

Les quatre fichiers d’état supplémentaires sont `app/error.tsx`, `app/(app)/error.tsx`, `app/global-error.tsx` et `app/not-found.tsx`. Ils sont couverts par le rapport des états et ses tests. Le tiroir des paramètres conserve ses sept sections : profil, confidentialité, préférences, notifications, modération, compte et données. Les anciennes adresses `/settings/<section>` ouvrent toujours la section du tiroir par leur redirection existante.

Les trois outils exclus sont `/dev/components`, `/preview/[token]` et `/shotcapture`. L’éditeur partagé et son aperçu conservent leurs tests ; ces outils ne sont pas présentés comme des pages apprenant. La console d’administration est une application séparée et ne fait pas partie de cette refonte.

## Vérification finale

- Suite web entière : **2 148 tests passés sur 286 fichiers**. Deux anciennes assertions de couverture de parcours ont été adaptées à l’affiche actuelle : l’image fournie reste une couche réelle, le rendu sans image garde marque, domaine et référence. Le composant n’a pas été modifié pour faire passer ces assertions.
- Suite entière du paquet UI : **143 tests passés sur 15 fichiers**. Elle couvre notamment les fenêtres, le focus, les sélecteurs et les outils d’édition partagés.
- TypeScript strict web et UI ; ESLint web et UI ; formatage Biome des 252 sources modifiées ou ajoutées ; espaces du diff contrôlés. Les séries ciblées des rapports de famille sont des sous-ensembles et ne sont pas additionnées à la suite globale.
- Les types de routes sont régénérés après retrait des aperçus. Les aperçus visuels temporaires des familles ont été supprimés de l’arbre produit ; leurs copies de travail sont archivées hors du dépôt. `/dev/states` a été revérifié comme vraie 404 après nettoyage.
- Le panneau de dossiers a été remesuré sur bureau et à 320 px : rayon de zéro sur tous les éléments visibles, contrôles de 44 px et aucun débordement. Aucun dossier réel créé pour la vérification.
- Le serveur web répond sur `localhost:3000` et la base Supabase locale fonctionne. Les captures et observations des rapports distinguent les pages réelles des composants rendus sur données de test.

Les rapports de famille constituent les preuves des parcours navigateur : filtres, ouvertures, navigation, clavier, affichages conditionnels et états disponibles. L’inventaire seul n’est pas une vérification fonctionnelle ; il est rapproché de ces rapports, des sources et des tests. Les nouvelles compositions ont des règles de réduction des mouvements ; leur contrôle est indiqué par famille, sans prétendre à un essai sur appareil physique.

## Limites conservées

Les données locales ne contiennent pas tous les états du produit. Les vues de classe, les parties de tournoi, Wrapped ouvert, les étapes protégées et les états sensibles du compte utilisent donc des exemples explicitement signalés, sans écrire de progression fictive. Les soumissions sont testées avec actions simulées lorsque les exercer réellement aurait publié du contenu, changé un compte ou consommé un jeton. Les opérations externes, les machines pédagogiques et les exports certifiés réels ne sont pas tous exécutés dans ce contrôle visuel.

Aucun build global de production, déploiement, test sur appareil physique ou suite d’intégration RLS/IDOR n’est revendiqué. La validation finale porte sur le web et les composants UI touchés ; elle ne transforme pas la dette visuelle native en parité accomplie. Les gardes, services, règles métier et textes juridiques sont conservés dans leur périmètre existant.

Les huit familles de l’extension sont implémentées et documentées. [Le suivi](redesign-progress.md) et [la DA](direction-artistique.md) servent désormais de référence pour les prochaines pages.
