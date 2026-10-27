# Vérification : tournois et Wrapped

24 octobre 2026. Périmètre : liste des tournois, tableau, défi, chargements ; Wrapped fermé, histoire, indisponibilité, carte finale et export. Direction Bastion, ENERGY 3 / RHYTHM 3 / MOTION 2. La partie donne la priorité au temps et aux scores ; le récap donne de l’espace aux chiffres sans déplacer les commandes.

## Preuves

- Données locales réelles : aucun tournoi pour le compte sans classe. La page l’explique avant les règles repliées ; « Comprendre les scores » est ouvert dans le navigateur. Wrapped est fermé le 24 octobre, affiche l’édition 2026 et son ouverture du 1er décembre. Ces règles et les dates n’ont pas été modifiées.
- Les états indisponibles avec ce compte ont été rendus dans un aperçu de développement provisoire, authentifié et signalé « Contrôle visuel · données de test ». Il utilise les composants réels avec `test/fixtures/event-data.ts`, sans rattachement de classe ni écriture de score. Les identifiants de tournoi de test sont invalides pour les actions réelles ; la réactualisation conserve la vue reçue quand l’action ne renvoie rien.
- À 320 px : liste à trois phases, tableau en cours, avant le départ, résultat, détail de défi, Wrapped fermé et histoire sans débordement de page. Aucun rayon non nul mesuré dans les racines inspectées. Les neuf diapositives sont parcourues manuellement avec contrôle de la largeur du cadre et de la scène à chacune ; aucun débordement horizontal. Wrapped fermé est aussi contrôlé à 768 px.
- Avant le départ : quatre emplacements verrouillés, aucun lien de défi et aucun tableau de joueurs. Après la fin : vainqueur visible, aucun chrono ni repère « En direct ». Ces états restent ceux des composants et règles existants.
- Le champ de flag mesure 44 px ; Valider reste désactivé à vide. Aucun flag soumis dans le navigateur. La consigne conserve son bloc de code à défilement propre. Les quatre états de défi et les lignes personnelles des classements restent lisibles.
- Wrapped : pause utilisée dans le navigateur, neuf écrans parcourus, carte finale maintenue. Téléchargement déclenché par Espace sur son bouton, sans changer de diapositive. PNG produit puis inspecté : 1080 × 1920, logo exact, polices de marque, quatre statistiques, domaine, identifiant `@donnees-de-test` et site lisibles. L’état occupé retombe à faux, sans erreur. Aucun partage externe effectué.
- Après réouverture depuis « Lire le récap de test », Échap ferme l’histoire et rend le focus à ce bouton. Le récap indisponible garde une action Fermer de 44 px et se ferme aussi sans débordement.
- 21 tests ciblés réussis : 15 existants sur liste, tableau, rafraîchissement et flag ; 4 nouveaux sur avance, pause, réduction des mouvements, navigation, fin et fermeture ; 2 nouveaux sur attente des polices, dimensions, nom du fichier et erreur d’export récupérable.
- Types de routes régénérés avec `next typegen --webpack`. TypeScript web et ESLint des sources et tests concernés passent. Biome appliqué sur 32 fichiers ; `git diff --check` propre. Les avertissements ES des configurations ESLint existantes ne sont pas des erreurs de lint.
- Aperçu provisoire retiré des sources ; sa route répond de nouveau « Cette page est introuvable ». Un nouvel onglet sur les vraies pages Tournois et Wrapped ne rapporte ni erreur ni avertissement navigateur. Les serveurs de développement restent disponibles.

Captures : `assets/tournaments-empty.png`, `tournaments-list-test.png`, `tournament-board-test.png`, `tournament-upcoming-test.png`, `tournament-challenge-test.png`, `wrapped-closed.png`, `wrapped-story-test.png`. L’image réellement téléchargée est `assets/wrapped-export-test.png` ; son contenu de test est identifié par le compte imprimé.

## Conservation et limites

Services, actions, gardes, calculs, rythme de rafraîchissement et contrats de données conservés. Pas de nouvelle dépendance, de schéma, d’accès Prisma ou de fonction de tournoi. Les étiquettes de score et les données de carte restent dans les fonctions communes avec l’app. La fenêtre Wrapped et l’aperçu administrateur existant ne changent pas. Le SVG Bastion et le canvas lisent les mêmes quatre tracés, sans nouvelle géométrie de logo.

La carte affichée conserve aussi le rang et la division de saison quand ils existent ; l’image exportée garde son contrat partagé de quatre chiffres, domaine, compte et site. La fermeture de la feuille de partage native reste silencieuse. Une erreur de génération d’image est annoncée et permet une nouvelle tentative.

Les tests unitaires simulent les actions ; l’aperçu n’est pas un tournoi réel. Aucun score, flag, rattachement ou récap fictif enregistré. Les machines Linux et Python n’ont pas été exécutées pendant cette vérification ; leurs composants et branchements restent en place. Le partage natif par fichier et les appareils physiques n’ont pas été testés. La réduction des mouvements est couverte par le test de l’horloge et les styles, sans changement de préférence du poste. Aucun build de production global déclaré par cette étape.

Revue React : pages et listes restent serveur ; tableau, histoire et export conservent leurs frontières client. Aucun nouvel effet ou chargement réseau. Le dessin canvas attend les polices à la demande. Le gestionnaire Espace laisse les boutons, liens et champs gérer leurs touches. Les états occupé, échec, sélection, score et fermeture restent exposés par les contrôles existants.

## Raisons

La craie distingue une décision ou une mesure à lire : entrer dans la partie, lire le chrono, repérer son équipe, comprendre un chiffre. Les autres lignes et outils restent sur carbone. Les dates et compteurs n’utilisent plus une typographie de terminal. Le code et le flag conservent leur monospace. Les carrés de phase sont fixes ; le temps et les points suffisent à exprimer l’activité. L’histoire conserve une entrée brève et ses vraies barres de lecture, avec des commandes stables. Palette encre/craie : 14,78:1 ; texte secondaire/craie : 6,29:1 ; brun/craie : 6,34:1 ; cuivre/panneau : 7,13:1.

## Gate Anti Slop

Verdicts limités au périmètre et aux preuves ci-dessus.

- R-02 PASS : texte fonctionnel, pas de tiret cadratin ajouté.
- R-03 PASS : largeurs mesurées à 320 px et sur les neuf diapositives ; contrôle tablette du récap fermé.
- R-17 PASS : statistiques et scores issus des contrats existants ; exemples de test identifiés.
- R-18 PASS : aucun témoignage ajouté.
- R-23 PASS : logo existant, tracés partagés avec l’export, aucun actif inventé.
- R-24 PASS : destinations réelles de tournoi, défi et retour conservées.
- R-25 PASS : palette de texte, contrôles et sélection de la DA ; contrastes principaux indiqués.
- R-26 PASS : règles ouvertes, navigation, pause, export et fermeture utilisés ; actions couvertes par les tests existants.
- R-27 PASS : chargements, absence de tournoi, récap fermé/indisponible et échec d’export conservés ou adaptés.
- R-28 PASS : aucune FAQ ajoutée ; les règles expliquent le calcul réel du score.
- R-32 PASS : contrôles de 44 px, export au clavier, focus rendu après Échap.
- R-33 PASS : modifications écrites dans les sources ; aperçu provisoire supprimé après vérification.
- R-34 PASS : thème de marque du site conservé.
- R-35 PASS : rendu exécuté, export inspecté et tests consignés avec leurs limites.
- R-36 PASS : aucune nouvelle promesse de sécurité ou de performance.
- R-37 PASS : direction et cadrans de session conservés.
- R-38 PASS : dates réelles, données de test distinguées, aucun acquis artificiel enregistré.
- R-01 PASS : carte sans dégradé, nouveaux panneaux mats.
- R-04 PASS : logo exact et pictogrammes des actions existantes.
- R-06 PASS : polices de marque ; monospace réservé aux saisies et contenus de code.
- R-07 PASS : aucun motif de grille de fond.
- R-08 PASS : flèches de retour et de navigation conservées pour leurs destinations.
- R-09 PASS : états nommés, sans capsule promotionnelle ajoutée.
- R-10 PASS : histoire opaque, aucune nouvelle surface de verre.
- R-12 PASS : aucune ombre de carte généralisée.
- R-13 PASS : lueur de carte et pulsation de phase retirées.
- R-14 PASS : liste, partie, exercice, affiche annuelle et histoire ont leurs compositions propres.
- R-19 PASS : entrée de diapositive brève, progression de lecture fonctionnelle, réduction des mouvements et cibles stables.
- R-22 PASS : typographie et marque en place d’une illustration générique.
- Dials PASS : ENERGY 3 / RHYTHM 3 / MOTION 2 conservés.
- Cohérence PASS : carbone, craie, cuivre, Barlow Condensed, Space Grotesk et angles droits.
- Point focal PASS : partie en cours, temps restant ou chiffre de la diapositive selon la tâche.
- Espacement PASS : colonnes repliées et code à défilement propre sans collision observée.
- Accent PASS : cuivre sur actions et repères ; couleurs sémantiques pour phase, rang et domaine.
- Identité PASS : logo, titrage condensé et mesures sur craie.
- Design Read PASS : tâches et raisons énoncées avant les changements et rappelées ici.
- C-1 PASS : conditions et chiffres groupés pour la lecture, règles facultatives sous les événements.
- C-2 PASS : fonctionnalités existantes conservées ; export et commandes réellement exercés.
- C-3 PASS : sections issues des événements et du récap, pas de panneau promotionnel ajouté.
- C-4 PASS : états, clavier, petits écrans et limites documentés.
- C-5 PASS : aucune donnée ou promesse produit fabriquée.
- R-05 PASS : compositions adaptées à l’événement, à la partie et au récit annuel.
- R-11 PASS : rayons calculés nuls dans les racines inspectées.
- R-15 PASS : actions nommées et indisponibilités explicites.
- R-16 PASS : copies et données communes du récit conservées.
- R-20 PASS : continuité de la direction Bastion.
- R-21 PASS : thème carbone existant, sans nouvelle bascule incomplète.
- R-29 PASS : palette de marque, couleurs sémantiques des données conservées.
- R-30 PASS : aucune imitation de produit tiers.
- R-31 PASS : raisons de palette, type, composition, espace, actifs et motion écrites.
