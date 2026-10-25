# Vérification : détail de parcours et lecture

23 octobre 2026. Ce contrôle couvre le détail d’un parcours, la page de leçon, ses outils et son bilan. Les examens, examens blancs, défis détaillés et revues ne sont pas déclarés réalisés. Lecture de design : choisir la mission suivante puis apprendre dans une colonne lisible, avec la géométrie Bastion. ENERGY 3 / RHYTHM 3 / MOTION 2.

## Preuves

- Parcours Réseaux : première mission disponible, seconde verrouillée, progression réelle 0/2, affiche de marque, reprise, examen blanc, fiches de module et certificat conservés. Pas de débordement à 320 et 768 px ; capture de bureau dans `assets/path-detail.png`. Les calculs et lectures serveur du parcours sont conservés.
- Leçons OSI et introduction SQL : affichage, passage à la section suivante et retour, plan, étapes verrouillées, notes ouvertes sans saisie, mode focus activé puis rétabli. À 320 px, les quatre boutons de la barre mesurent 44 × 44 px ; aucun rayon non nul observé dans les racines inspectées. Les longs exemples PHP et SQL défilent dans leur bloc, sans élargir la page.
- Notes ancrées à 1440 px : page et panneau occupent deux zones distinctes sans débordement. Plan fermé par Échap : focus revenu à « Plan de la leçon ». Formulaire de question ouvert puis annulé, focus visible sur son champ. Capture de lecture dans `assets/lesson-detail.png`.
- 66 tests du périmètre parcours réussis. 105 tests ciblés réussis sur la lecture, les outils, les notes, les avis, les questions, les verrous et la cellule certificat. Après modification du bilan, 21 tests réussis sur bilan/stepper/avis, dont deux nouveaux contrôles du total crédité, du score, des destinations et de la réduction des mouvements. Ces séries se recoupent et ne sont pas additionnées.
- TypeScript web et ESLint des TSX concernés passent. Biome appliqué ; `git diff --check` propre ; quatre sources principales contrôlées sans tiret cadratin. Journal navigateur sans erreur ou avertissement au contrôle de la lecture.
- Contrastes calculés : encre/craie 14,78:1, texte secondaire/craie 6,29:1, barre de progression brune/craie 6,34:1, texte secondaire/panneau 9,30:1, cuivre clair/panneau 7,13:1, limite de contrôle/panneau 3,76:1.

## Limites et conservation fonctionnelle

Les captures utilisent les données locales disponibles. Aucun quiz ni examen soumis, aucune note ou question enregistrée, aucun certificat émis ou téléchargé pendant cette vérification. L’ouverture d’une leçon garde sa création éventuelle de progression IN_PROGRESS. Le bilan de réussite est vérifié en test avec un résultat contrôlé, sans attribuer un faux acquis au compte local. Tous les laboratoires ne sont pas parcourus dans le navigateur ; leurs composants et actions sont conservés. Les règles CSS reduced-motion et le résultat immédiat du bilan sont contrôlés ; aucun appareil physique n’a été utilisé.

Revue React : la page parcours reste serveur avec ses gardes, équivalences et conditions de certificat. La page de leçon garde son chargement parallèle et sa garde avant progression. Le panneau suivant devient serveur après retrait des survols impératifs ; son identifiant d’aide est propre à l’unique panneau de la page. Les outils et exercices gardent leurs frontières client existantes. Aucun contrat d’action, schéma ou dépendance ajouté.

## Raisons

L’affiche réutilise la marque et la couverture réelle. La liste numérotée rend l’ordre des missions explicite. La craie distingue reprise et mission disponible ; le carbone porte les étapes et outils. Le titrage condensé donne une voix commune sans ajouter un grand panneau décoratif avant la lecture. Le code reste en monospace et la prose en Space Grotesk. Le rail se replie dans le flux ; les notes conservent leur place à côté du texte sur écran large. La motion accompagne une ouverture ou le total gagné, sans boucle décorative.

## Gate Anti Slop

Verdicts limités aux modifications et vérifications ci-dessus.

- R-02 PASS : quatre sources principales contrôlées sans tiret cadratin.
- R-03 PASS : profils de largeur, outils et code contrôlés sans débordement de page.
- R-17 PASS : comptes, progression, XP et résultats issus des données existantes.
- R-18 PASS : aucun témoignage ajouté.
- R-23 PASS : logo et couvertures existants réutilisés.
- R-24 PASS : destinations de reprise, module, certificat et leçon conservées.
- R-25 PASS : couples de texte et contrôles calculés ci-dessus.
- R-26 PASS : sections, plan, notes, focus et formulaire exercés ; tests d’actions conservés.
- R-27 PASS : chargements adaptés, parcours sans mission expliqué, verrous et erreurs conservés.
- R-28 PASS : aucune FAQ ajoutée.
- R-32 PASS : Échap et retour de focus vérifiés, focus du formulaire visible, outils de 44 px.
- R-33 PASS : sources modifiées avec apply_patch et formatées avec Biome.
- R-34 PASS : thème de marque conservé, aucune bascule incomplète ajoutée.
- R-35 PASS : exécution et parcours navigateur consignés ; tests et limites détaillés ci-dessus.
- R-36 PASS : aucune nouvelle promesse de sécurité ou de performance.
- R-37 PASS : direction et cadrans déclarés avant la composition.
- R-38 PASS : captures de données réelles ; résultats de test explicitement distingués.
- R-01 PASS : nouvelles surfaces mates, ancien dégradé du bilan retiré.
- R-04 PASS : marque dans sa zone, pictogrammes de PDF et badges liés aux actions réelles.
- R-06 PASS : choix typographiques motivés ; monospace conservé pour le code.
- R-07 PASS : aucune grille de fond ajoutée.
- R-08 PASS : repères d’accès sur les actions de navigation.
- R-09 PASS : métadonnées courtes sans capsules promotionnelles.
- R-10 PASS : barre et tiroirs sans flou de fond.
- R-12 PASS : panneaux mats, sans ombre de carte généralisée.
- R-13 PASS : lueurs du titre de section et du bilan retirées.
- R-14 PASS : itinéraire, rail et lecture ont leurs compositions propres.
- R-19 PASS : titre bref, compteur lié au gain et réduction des mouvements ; pas de boucle ajoutée.
- R-22 PASS : affiche fondée sur les actifs réels, aucune illustration générique.
- Cadrans PASS : ENERGY 3 / RHYTHM 3 / MOTION 2 explicites.
- Cohérence PASS : titrage fort, étapes ordonnées, lecture stable.
- Point focal PASS : reprise du parcours ou section en cours selon la tâche.
- Espace structurel PASS : missions, métadonnées et outils séparés ; rail mobile dans le flux.
- Accent PASS : cuivre sur l’action et les repères ; craie pour la reprise et le bilan.
- Motif PASS : logo, titrage condensé, géométrie carrée et numérotation utile.
- Design Read PASS : lecture écrite en ouverture et annoncée avant les changements.
- C-1 PASS : décisions majeures motivées ci-dessus.
- C-2 PASS : actions existantes conservées, pas de bouton de démonstration.
- C-3 PASS : contenu fondé sur modules, missions et lecture réels.
- C-4 PASS : états et largeurs contrôlés, limites des laboratoires et mutations explicites.
- C-5 PASS : aucun acquis fictif présenté comme une donnée utilisateur.
- R-05 PASS : itinéraire et lecture suivent leurs tâches, sans composition marketing ajoutée.
- R-11 PASS : rayons calculés nuls dans les racines inspectées.
- R-15 PASS : actions nommées, dont Ouvrir la leçon, Fiche PDF et Fermer.
- R-16 PASS : texte fonctionnel, sans slogan technologique ajouté.
- R-20 PASS : continuité de la signature Bastion avec les catalogues.
- R-21 PASS : thème de la plateforme conservé.
- R-29 PASS : carbone, craie et cuivre ; couleurs des badges et du code liées à leurs données.
- R-30 PASS : aucune autre interface choisie comme modèle.
- R-31 PASS : raisons de palette, type, composition, espace, actifs et motion écrites.
