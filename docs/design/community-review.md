# Vérification Communauté

23 octobre 2026. Première famille de l’objectif « faire les autres pages ». Le suivi global est dans [redesign-progress.md](redesign-progress.md) ; ce document ne déclare pas le reste du site terminé.

## Preuves

- Forum, catégorie et composition, Duels et son guide, Aide et création de demande ouverts dans le navigateur local. Le compte a cinq sections, aucun sujet, aucun duel ni ticket. Aucun contenu public ni message de support envoyé pour remplir les captures. Les états peuplés ont été revus dans le code et les tests ; aucune capture peuplée n’est revendiquée.
- À 320 px : aucun titre, champ, article ou bouton inspecté ne déborde sur les pages et formulaires contrôlés. Fenêtres, champs et boutons : rayon calculé nul. Les sept options de thème mesurent 44 px de haut et utilisent Space Grotesk.
- À 768 px : forum en deux colonnes de 353 px environ, document de 753 px avec scrollbar, sans débordement. À 1280 px : répertoire et messages récents distincts, lancement de duel et nouvelle demande sur deux matières.
- Sujet : ouverture, Échap et retour de focus au bouton Nouveau sujet vérifiés. Aide : soumission vide refusée avec « Choisis un thème. », choix Question et Ajouter mon établissement, checklist et annulation vérifiés. Guide de duel ouvert sur bureau et téléphone.
- Web : 46 tests des composants/actions Forum, Aide et partie de duel ; 44 tests des services forum, duels et tickets. UI : 32 tests ModalShell et Select, dont restauration du focus et fenêtres superposées. Total : 122 tests réussis.
- TypeScript web et UI, ESLint des sources TSX modifiées web et UI : sortie 0. Avertissements Node existants sur les configurations de module uniquement. Biome appliqué ; git diff --check propre. Huit sources principales contrôlées sans tiret cadratin.
- Couples Bastion mesurés réutilisés : encre/craie 14,78:1, secondaire/craie 6,29:1, cuivre clair/panneau 7,13:1 ; limite de contrôle sur panneau 3,76:1.
- Journal final du navigateur sans erreur ni avertissement. Serveur de développement utilisé, sans build de production. Pas d’appareil physique ni d’émulation système de réduction des mouvements ; règles CSS contrôlées.
- Revue React : lectures et gardes serveur conservées, aucune nouvelle frontière client pour les vues statiques, contrats d’actions conservés. Polices disponibles depuis le body pour les portails. Select accepte une classe de panneau facultative ; les autres appels et la console gardent leurs défauts. ModalShell rend le focus si la fenêtre fermée était au-dessus et que le déclencheur existe encore hors d’une zone inerte.

## Raisons

Carbone pour le répertoire, l’auteur et les outils ; craie pour un message ou une action à préparer. Barlow Condensed porte les titres, Space Grotesk sert les échanges. Sections descriptives pour choisir un forum, lignes pour suivre les demandes, face-à-face pour les duels. Le logo possède sa zone séparée du texte. Les choix ont des cibles de 44 px. L’opacité signale l’ouverture sans déplacer les cibles. ENERGY 3 / RHYTHM 3 / MOTION 2.

## Gate antislop

Verdicts limités aux modifications et vérifications ci-dessus.

- R-02 PASS : huit sources principales sans tiret cadratin.
- R-03 PASS : mesures à 320, 768 et 1280 px sans débordement observé.
- R-17 PASS : compteurs et états issus des lectures existantes.
- R-18 PASS : aucun témoignage ajouté.
- R-23 PASS : logo, avatars, navigation et objets existants réutilisés.
- R-24 PASS : routes de sections, sujets, duels et tickets conservées et inspectées.
- R-25 PASS : couples de texte et limites de contrôle mesurés ci-dessus.
- R-26 PASS : ouvertures, guide, choix, validation et annulation exercés ; actions couvertes par les tests.
- R-27 PASS : chargements adaptés, états vides explicites, erreurs et conclusions conservées.
- R-28 PASS : aucune FAQ ajoutée.
- R-32 PASS : Échap et retour de focus vérifiés ; piège de focus et fenêtres superposées testés ; options de 44 px.
- R-33 PASS : sources écrites par apply_patch, Biome pour le formatage.
- R-34 PASS : continuité de la DA, aucune bascule incomplète ajoutée.
- R-35 PASS : application exécutée, parcours consignés, 122 tests réussis ; cas sans données explicités.
- R-36 PASS : aucune promesse de sécurité ou performance ajoutée.
- R-37 PASS : direction et trois cadrans déclarés avant l’implémentation.
- R-38 PASS : données locales réelles, aucun contenu social fictif publié.
- R-01 PASS : surfaces mates, aucun gradient de fond ajouté.
- R-04 PASS : icônes fonctionnelles et logo existant dans sa zone réservée.
- R-06 PASS : choix typographiques motivés ci-dessus ; monospace limité aux repères.
- R-07 PASS : aucune grille de fond ajoutée.
- R-08 PASS : flèches sur les accès, pas sur chaque contrôle.
- R-09 PASS : états réels et contrôles carrés, aucune capsule promotionnelle.
- R-10 PASS : fenêtres sans flou de fond.
- R-12 PASS : cartes mates et fenêtre sans grande ombre.
- R-13 PASS : aucun glow décoratif dans les nouveaux panneaux.
- R-14 PASS : répertoire, fil, duel et demandes ont des hiérarchies distinctes.
- R-19 PASS : titre bref, guide par opacité, suivi sans boucle ; reduced-motion présent.
- R-22 PASS : aucune illustration générique ajoutée.
- Cadrans PASS : ENERGY 3 / RHYTHM 3 / MOTION 2 explicites.
- Cohérence PASS : titres forts, matières contrastées, compositions variables, ouvertures brèves.
- Point focal PASS : répertoire, lancement/invitation et création ou fil de demande selon la page.
- Espace structurel PASS : titre, bilan et contenu séparés ; repli propre à la tâche.
- Accent PASS : cuivre sur marque et action, autres couleurs liées aux états réels.
- Motif PASS : titrage condensé, point cuivre, carbone/craie et angles droits.
- Design Read PASS : lecture déclarée avant les modifications, reprise dans ce document.
- C-1 PASS : raisons des décisions majeures écrites ci-dessus.
- C-2 PASS : contrôles branchés aux actions existantes, aucun bouton de démonstration.
- C-3 PASS : guide facultatif, sections liées aux échanges et au jeu.
- C-4 PASS : états disponibles, mobile, fenêtres et clavier contrôlés ; limites consignées.
- C-5 PASS : aucun chiffre ni contenu social inventé.
- R-05 PASS : répertoire, fil, duel et suivi distincts, sans héros marketing répété.
- R-11 PASS : rayons calculés nuls dans les formulaires inspectés.
- R-15 PASS : actions concrètes, dont Nouveau sujet, Publier, Nouvelle demande et Annuler.
- R-16 PASS : texte fonctionnel, aucun slogan technologique.
- R-20 PASS : voix et géométrie Bastion dans chaque famille.
- R-21 PASS : continuité de la DA de l’espace d’apprentissage technique.
- R-29 PASS : carbone, craie, cuivre et couleurs d’état existantes.
- R-30 PASS : aucune autre interface prise comme modèle à cloner.
- R-31 PASS : raisons de palette, type, composition, espacement, visuels et motion consignées.
