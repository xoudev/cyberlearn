# Suivi du rework Bastion

Objectif de session : appliquer la nouvelle DA aux autres pages du site, en conservant leurs fonctionnalités. Angles droits, logo existant, Barlow Condensed et Space Grotesk, palette carbone/craie/cuivre, motion brève et utile. ENERGY 3 / RHYTHM 3 / MOTION 2.

Le site web est le périmètre de cette demande de design. Les surfaces natives partagées restent suivies dans MOBILE_PARITY.md. Les écrans de développement (`/dev/components`, `/shotcapture`, aperçu de contenu par jeton) ne sont pas des pages produit à promouvoir ; leurs outils doivent rester fonctionnels.

## Déjà réalisés avant cette extension

- Home, dashboard, sidebar et top bar.
- Catalogues de parcours et de leçons.
- Révisions, Défis, Bloc-notes.
- Badges, Certificats, Casier, Classement.

## Familles restantes

| Famille | Surfaces | État |
| --- | --- | --- |
| Communauté | Forum, catégorie, sujet, composition/édition/réponse ; Duels, partie ; Aide, demande, création/réponse | Implémenté ; [contrôles et limites](community-review.md) |
| Compte | Profil privé, profil public, paramètres (sept sections et fenêtres associées) | Implémenté ; [contrôles et limites](account-review.md) |
| Apprentissage | Détail parcours, leçon, défi, examen, examen blanc, revue | Implémenté ; [parcours et lecture](learning-detail-review.md), [examens et défis](assessment-review.md) |
| Établissement | Ma classe, création/édition de leçon et de parcours | Implémenté ; [contrôles et limites](class-review.md), vues de classe sur données de test faute de rattachement local |
| Événements | Tournois, détail, exercice ; récapitulatif Wrapped | Implémenté ; [contrôles et limites](events-review.md), états de jeu sur données de test signalées |
| Accueil du compte | Connexion, inscription, récupération, MFA, onboarding et placement | Implémenté ; [contrôles et limites](access-review.md), étapes protégées contrôlées dans un aperçu temporaire |
| Public | Catalogue public, téléchargement, glossaire, contact, vérification de certificat | Implémenté ; [contrôles et limites](public-review.md), états de certificat sur exemples signalés |
| Informations et états | Mentions, conditions, confidentialité, bannissement, suppression/conservation du compte, erreurs et pages introuvables | Implémenté ; [contrôles et limites](states-review.md), états sensibles sur données de test signalées |

Les huit familles sont implémentées. Voir [l’inventaire et les vérifications finales](redesign-audit.md) pour la couverture des routes, les outils exclus et les limites de validation.

La demande a ensuite été étendue aux fenêtres et sorties de l’application : [suivi de cette extension](extensions-progress.md), [couverture et preuves](extensions-review.md). L’inventaire des routes n’en tenait pas lieu.

## Vérification attendue par famille

Inspecter le rendu avec les données locales disponibles ; tester les contrôles concernés et leurs états vides, chargement, erreur et succès. Vérifier les angles droits, le focus, les petits écrans et la réduction des mouvements. Exécuter TypeScript, ESLint et les tests correspondant aux composants modifiés. Consigner les limites de données locales sans remplir les captures de faux contenu.

Ne pas conclure que toute la demande est terminée tant qu’une famille reste à faire ou non vérifiée.
