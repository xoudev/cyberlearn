# Vérification : la classe et les outils de rédaction

24 octobre 2026. Périmètre : Ma classe côté élève et professeur, création et édition des leçons et parcours de classe, cinq onglets de suivi et chargements associés. Direction Bastion, ENERGY 3 / RHYTHM 3 / MOTION 2.

La tâche de l’élève est de trouver son travail et sa progression. Celle du professeur est de suivre les élèves puis de préparer ou partager le contenu. Les deux vues conservent leur ordre et leurs règles. Les outils de rédaction se composent autour des champs et de la sélection, sans nouvelle étape de publication.

## Vérifications

- Le compte local n’a ni classe ni enseignement rattaché. `/my-class` conserve sa réponse introuvable, conformément à la garde existante. Aucun rattachement, permission ou contenu de classe ajouté pour obtenir une capture.
- Les composants réels sont rendus avec des données de test explicitement signalées dans un serveur temporaire extérieur au produit. Les onglets professeur sont ouverts dans le rendu de test avant export. Ces pages statiques prouvent leur mise en page ; leurs boutons ne simulent pas une sauvegarde dans le navigateur.
- À 320 px : vue élève, suivi professeur, constructeur, éditeur de leçon, travail, ressources, parcours vides et leçons vides sans débordement de page. Les onglets ont leur défilement propre. Aucun rayon non nul mesuré dans les racines inspectées. Contrôle supplémentaire à 768 px de la vue sans leçon.
- Le constructeur conserve son ordre dans le champ soumis, ne propose pas une leçon déjà choisie et garde la publication désactivée à vide. Trois tests ajoutés couvrent sélection, remontée, retrait, retour au catalogue, recherche et conservation d’un ordre existant.
- Dix tests du périmètre classe passent : composant élève, constructeur et garde d’aperçu. Trente-six tests du paquet UI passent sur blocs, modèle des blocs, panneau MDX, aperçu et thème. Le nouveau contrôle du thème vérifie la résolution des tokens locaux et l’absence d’expression CSS donnée à Monaco.
- TypeScript web et UI, ESLint des sources concernées, Biome (40 fichiers) et `git diff --check` passent. Les avertissements de module ES des configurations ESLint existantes sont sans erreur de lint.
- Les commandes de rédaction, champs et filtres mesurés font au moins 44 px. Les onglets font 48 px. Le bouton Retirer, corrigé après inspection mobile, mesure 64,84 × 44 px. Un Tab depuis la recherche du constructeur atteint l’action Ajouter, avec un contour cuivre de 2 px décalé de 3 px.
- Les aides de blocs passent à 12 px et au gris lisible. Les titres de section de l’éditeur se recomposent en une colonne sur téléphone. Le bouton de calendrier natif reçoit le schéma de couleur sombre. La barre d’onglets ne présente plus de défilement vertical parasite ; le compteur sélectionné est brun sur craie.
- Les deux polices de marque sont confirmées chargées dans le navigateur des rendus de test. Captures `assets/class-student-test.png`, `class-teacher-test.png`, `class-builder-test.png` et `class-lesson-test.png`.
- Contrastes calculés : encre/craie 14,78:1 ; gris secondaire/craie 6,29:1 ; brun/craie 6,34:1 ; aides grises/panneau 7,10:1 ; bord des contrôles/fond 4,07:1 ; focus cuivre/panneau 7,13:1.

## Conservation et limites

Gardes des cinq pages, lectures serveur, anonymisation, calculs et contrats d’action conservés. Les formulaires gardent leurs contraintes et champs cachés. Aucun accès Prisma, schéma, dépendance ou service ajouté. Les succès et erreurs de rédaction ont un rôle explicite ; les filtres et choix de travail exposent leur sélection.

Le CSS de classe est chargé par son layout et limité à sa racine. Les listes de Select portées dans le document reçoivent une classe dédiée. Les classes ajoutées aux composants MDX partagés n’imposent aucun style à la console. Le thème de code conserve sa palette de repli lorsqu’aucun token de classe n’est fourni. Les pages et chargements restent serveur ; les composants d’édition conservent leurs frontières client.

Le navigateur n’a pas publié, supprimé, assigné ou partagé de contenu. L’aperçu réel ne peut pas être exercé avec le compte sans classe ; la capture statique de l’éditeur conserve son état de préparation, et les rafraîchissements sont couverts par les tests UI existants. Les menus portés des Select ne sont pas ouverts dans les captures statiques. La réduction des mouvements est définie dans les styles, sans contrôle sur appareil physique. Aucune vérification globale de toutes les autres familles n’est impliquée.

## Gate Anti Slop

Verdicts limités à ce périmètre et aux preuves ci-dessus.

- R-02 PASS : texte fonctionnel, aucune prose marketing ni tiret cadratin ajouté.
- R-03 PASS : huit vues inspectées à 320 px, défilement des onglets contenu dans sa barre.
- R-17 PASS : calculs existants conservés, données des captures explicitement signalées de test.
- R-18 PASS : aucun témoignage ajouté.
- R-23 PASS : aucune illustration ni actif inventé.
- R-24 PASS : liens de lecture, retour et édition conservés.
- R-25 PASS : contrastes calculés ci-dessus ; aides et compteurs corrigés.
- R-26 PASS : sélection et ordre exercés par les tests ; limites des mutations navigateur déclarées.
- R-27 PASS : chargements adaptés, vides conservés, garde réelle vérifiée et erreurs annoncées.
- R-28 PASS : aucune FAQ.
- R-32 PASS : cibles mesurées, focus clavier observé et états de sélection exposés.
- R-33 PASS : modifications dans les sources, vues de test extérieures au produit.
- R-34 PASS : thème de marque du site conservé, palette de repli de la console conservée.
- R-35 PASS : rendu exécuté, tests et mesures consignés, limites déclarées.
- R-36 PASS : aucune nouvelle promesse de sécurité ou de performance.
- R-37 PASS : direction et cadrans de session conservés.
- R-38 PASS : aucun acquis, établissement ou rattachement fictif enregistré en base.
- R-01 PASS : surfaces mates ; fonds violets des nouvelles zones remplacés.
- R-04 PASS : aucune nouvelle famille d’icônes décoratives.
- R-06 PASS : Barlow Condensed pour hiérarchie, Space Grotesk pour formulaires, monospace pour code.
- R-07 PASS : aucun motif de fond ajouté.
- R-08 PASS : flèches conservées pour réordonner, sans flèche décorative ajoutée.
- R-09 PASS : métadonnées utiles, sans capsule promotionnelle.
- R-10 PASS : aucun effet de verre.
- R-12 PASS : panneaux mats, sans ombre généralisée.
- R-13 PASS : témoins lumineux décoratifs de l’éditeur masqués dans la classe.
- R-14 PASS : rang personnel, roster, formulaire et sélection ordonnée ont leur composition propre.
- R-19 PASS : interaction stable, transitions existantes et réduction des mouvements, aucune boucle ajoutée.
- R-22 PASS : aucune illustration de terminal inventée.
- Dials PASS : ENERGY 3 / RHYTHM 3 / MOTION 2 conservés.
- Cohérence PASS : polices, craie, carbone et angles droits des familles déjà refaites.
- Point focal PASS : travail pour l’élève, élèves à suivre pour le professeur, contenu dans les éditeurs.
- Espacement PASS : lignes et commandes se réorganisent sur téléphone sans collision observée.
- Accent PASS : cuivre pour action et focus, craie pour sélection et situation personnelle.
- Identité PASS : géométrie carrée et titrage de marque, sans nouvel habillage générique.
- Design Read PASS : tâches et raisons de composition énoncées en ouverture.
- C-1 PASS : ordre des tâches conservé, sélection ordonnée distincte du catalogue.
- C-2 PASS : actions et champs existants conservés, tests de l’ordre ajouté.
- C-3 PASS : sections fondées sur les données de classe, sans contenu promotionnel.
- C-4 PASS : contrôles et états inspectés, limites du compte local explicites.
- C-5 PASS : données de test signalées et sans écriture métier.
- R-05 PASS : compositions adaptées au suivi, à la lecture des ressources et à la rédaction.
- R-11 PASS : rayons calculés nuls dans les racines inspectées.
- R-15 PASS : actions spécifiques et boutons de réordonnancement nommant leur leçon.
- R-16 PASS : aide propre à la tâche de rédaction.
- R-20 PASS : continuité de la DA du dépôt.
- R-21 PASS : thème carbone existant, calendrier natif accordé à ce thème.
- R-29 PASS : palette de marque, couleurs de syntaxe et états sémantiques conservés.
- R-30 PASS : aucun modèle d’un autre produit.
- R-31 PASS : raisons de type, composition, espace, palette et contrôles consignées.
