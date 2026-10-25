# Console Bastion — suivi de mise en œuvre

## Jalon 1 — site apprenant

Le rework du site, ses composants partagés, courriels, certificats, assets et documents sont regroupés dans un jalon distinct sur `redesign`, avant les modifications de la console.

## Plan accepté

1. Vérifier et publier le jalon web.
2. Partager les marges et le logo ; charger Barlow Condensed, Space Grotesk et JetBrains Mono dans la console.
3. Reprendre le shell et les composants, avec une identification administrative permanente.
4. Migrer les 42 pages et les états associés, sans changer les règles métier.
5. Vérifier, documenter la couverture et publier le jalon admin.

## Direction retenue

Console dense, angles droits, fond `#0B0C0E`, panneaux `#121418`, menus `#191C22`, texte `#F4F2ED`, texte secondaire `#C2BFB8`, métadonnées `#AAA79F`, cuivre `#FF6B2B` et survol `#FF864F`, craie `#EAE7DF`, encre `#141518`, séparations `#303137`, contours de champs `#74767D`. Les couleurs sémantiques restent distinctes et accompagnées de libellés.

Marges communes : 16 / 28 / 36 px ; haut 24 / 28 / 32 px ; bas 80 / 96 / 110 px aux seuils 768 et 1280 px. Sidebar de 240 px, menu mobile sous 1024 px, barre de 56 px incluant le repère cuivre.

Le logo mène au dashboard admin. La barre affiche « Console d’administration » ou « ADMIN », y compris lorsque le menu mobile est fermé. L’ouverture du site apprenant reste une action explicite dans un nouvel onglet. Les permissions ADMIN et MFA demeurent inchangées.

## État courant

Phase 1 vérifiée : formatage, lint et types du monorepo réussis ; build de production web réussi. Les suites admin et des packages passent. La suite web passe avec quatre workers : 291 fichiers, 2 170 tests. Deux dépassements de délai sous la charge de toutes les suites simultanées ne se reproduisent pas dans cette exécution complète bornée.

Les fichiers d’instructions générés par Next sont exclus du contrôle typographique des textes français : ils ne sont pas servis par l’application.

Les preuves détaillées du site se trouvent dans `redesign-audit.md` et les rapports de chaque famille. La couverture et les limites des contrôles admin seront consignées séparément.
