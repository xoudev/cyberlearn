# Vérification : examens et défis

24 octobre 2026. Périmètre : examen final, examen blanc, détail de défi, chargements associés et ancienne route de révision. Direction Bastion, ENERGY 3 / RHYTHM 3 / MOTION 2. Le départ prépare l’épreuve ; la session donne la priorité à la question ; le résultat explique ce qui reste à revoir.

## Preuves et limites

- Départs réels du parcours Réseaux : aucun questionnaire actif, aucun module doté d’assez de questions. Les indisponibilités, comptes nuls et actions désactivées sont affichés. Examen blanc à 320 px : aucun débordement ni rayon non nul. Captures `assets/final-exam.png` et `assets/mock-exam.png`.
- Défis réels SQL, Python et XSS verrouillé parcourus sans soumission. Pré-requis, consignes, tentatives, indices gratuits et payants, éditeur Python et solutions verrouillées conservés. À 320 px, aucune largeur de page excessive ; aucun contrôle arrondi dans la racine inspectée du défi Python. Le titre SQL descend à 42 px sur téléphone. Capture `assets/challenge-detail.png`.
- `/review` aboutit à `/revisions` dans le navigateur. Son chargement réutilise celui des révisions.
- Les flux final et blanc ont 13 tests existants réussis : temps, remise automatique, reprise, résultats et correction. Les défis et leurs services ont 49 tests réussis. Ces contrôles utilisent des actions simulées ; ils ne prouvent pas une soumission à la base locale.
- TypeScript web et ESLint du périmètre passent. Aucun changement de schéma, contrat d’action, règle de calcul, garde, dépendance ou accès aux données.
- Les vues indisponibles avec les données locales sont rendues à partir des composants réels et de résultats de test, dans un serveur temporaire extérieur au produit. Les cinq états sont signalés « Contrôle visuel · données de test ». À 320 px : session finale, bilans réussite/échec, session blanche et bilan blanc sans débordement après correction des grilles. Le bilan d’échec est également mesuré à 768 px. La navigation numérotée finale occupe 288 px à 320 px et ne subit plus de flou. Capture `assets/exam-test-question.png` explicitement réservée à cette vérification.

Aucun flag, examen, certificat ni indice payant n’a été soumis ou créé. Le navigateur ne remplace pas les tests de flux pour les états de test statiques. Pas de contrôle sur appareil physique. Les règles de réduction des mouvements suppriment les animations et transitions des nouvelles racines.

Revue React : gardes et lectures serveur conservées ; frontières client limitées aux flux existants. Réponses sélectionnées et corrections exposent leurs états ARIA. Le champ de flag a une étiquette et ses erreurs un rôle d’alerte. Aucun nouvel effet, chargement client ou calcul métier ajouté.

## Gate Anti Slop

Verdicts limités aux changements ci-dessus. Les raisons de palette, polices et géométrie sont celles de la DA du dépôt.

- R-02 PASS : textes d’interface directs, sans tiret cadratin ajouté.
- R-03 PASS : vues mobiles et résultat tablette mesurés ; grilles de résultats corrigées.
- R-17 PASS : questions, scores, temps, tentatives et XP proviennent des contrats existants.
- R-18 PASS : aucun témoignage.
- R-23 PASS : logo existant, aucune illustration distante ou inventée.
- R-24 PASS : liens de retour, prérequis et destinations de certificat conservés.
- R-25 PASS : palette de texte et de contrôle commune carbone/craie/cuivre ; sélection conserve un contraste encre/craie.
- R-26 PASS : flux couverts par les 13 et 49 tests ; limites de soumission navigateur déclarées.
- R-27 PASS : indisponibilités réelles, chargements, erreurs et bilans conservés.
- R-28 PASS : aucune FAQ.
- R-32 PASS : contrôles de 44 px au moins, focus cuivre, état sélectionné et correction exposés.
- R-33 PASS : modifications dans les sources TSX/CSS, pas de modification DOM en guise de correction.
- R-34 PASS : thème de marque existant conservé.
- R-35 PASS : application exécutée, mesures et tests consignés avec leurs limites.
- R-36 PASS : aucune promesse de sécurité ou de performance ajoutée.
- R-37 PASS : direction et cadrans de session conservés.
- R-38 PASS : vues réelles et données de test distinguées, aucune progression fabriquée.
- R-01 PASS : surfaces mates, dégradés décoratifs retirés des nouvelles zones.
- R-04 PASS : logo de marque et icônes des actions existantes.
- R-06 PASS : Barlow Condensed pour titre/chiffres, Space Grotesk pour lecture, monospace pour le code.
- R-07 PASS : grilles de fond retirées.
- R-08 PASS : flèches de navigation conservées avec une destination réelle.
- R-09 PASS : métadonnées courtes, sans capsule promotionnelle ajoutée.
- R-10 PASS : barre et pied de session mats, sans flou.
- R-12 PASS : pas d’ombre généralisée.
- R-13 PASS : lueurs et pulsations décoratives retirées.
- R-14 PASS : préparation, question, résultat et espace de défi ont des compositions distinctes.
- R-19 PASS : pas de boucle décorative ; états de temps et réduction des mouvements conservés.
- R-22 PASS : aucun habillage de terminal inventé.
- Dials PASS : ENERGY 3 / RHYTHM 3 / MOTION 2 de la DA conservés.
- Cohérence PASS : palette, géométrie et polices communes aux pages déjà refaites.
- Point focal PASS : conditions au départ, question en session, score au résultat.
- Espacement PASS : grilles réorganisées sur téléphone, contrôles séparés et texte sans collision observée.
- Accent PASS : cuivre réservé aux actions, sélection et repères.
- Identité PASS : marque existante, grands titres condensés, craie et angles droits.
- Design Read PASS : préparer, pratiquer, comprendre le résultat ; aucun panneau de décoration avant la tâche.
- C-1 PASS : conditions groupées pour décider, code et consigne séparés pour agir.
- C-2 PASS : actions, reprise, délais et corrections conservés et couverts par les tests.
- C-3 PASS : sections motivées par les données de l’épreuve ou du défi.
- C-4 PASS : mobile sans débordement, sélection visible, chargements et erreurs conservés.
- C-5 PASS : aucune donnée ou affirmation produit inventée.
- R-05 PASS : compositions adaptées aux étapes de travail.
- R-11 PASS : nouvelles racines à rayon nul, contrôle navigateur sur le périmètre décrit.
- R-15 PASS : actions nommées par leur tâche, indisponibilité expliquée.
- R-16 PASS : explications utiles à l’épreuve, pas de nouveau texte marketing.
- R-20 PASS : suite de la direction Bastion existante.
- R-21 PASS : thème carbone demandé, pas de choix de thème implicite.
- R-29 PASS : palette de marque et couleurs sémantiques de résultat conservées.
- R-30 PASS : aucune imitation de produit tiers.
- R-31 PASS : motifs de composition décrits, aucune dépendance ajoutée.
