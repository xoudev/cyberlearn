# Pages publiques : contrôle Bastion

24 octobre 2026. Catalogue public, téléchargement, glossaire, contact, recherche et affichage d’un certificat. Direction carbone/craie/cuivre, vrai logo, Barlow Condensed et Space Grotesk, angles droits. ENERGY 3 / RHYTHM 3 / MOTION 2.

## Composition et fonctions

Le catalogue utilisait déjà les affiches Bastion : sa composition est conservée. Le mode connecté garde les cartes vers les parcours et le cadre de l’app ; le visiteur garde les cartes vers l’inscription et la navigation publique. La barre du haut nomme désormais Catalogue et Glossaire quand ces pages sont ouvertes dans l’app.

Le glossaire devient un répertoire : titre, compte réel des termes sur craie, index de catégories, puis définitions rangées par domaine. Les 96 définitions et leurs identifiants viennent toujours de la liste partagée avec les leçons et le mobile. Une définition ciblée par son ancre passe sur craie. Le terme et sa définition se superposent sur téléphone.

Le téléchargement remplace la fausse capture de téléphone et ses chiffres d’exemple par une affiche de marque. Les liens configurés déterminent toujours la disponibilité Android, APK et App Store. Les instructions Safari et le préremplissage d’une demande de disponibilité restent accessibles. Les informations de plateforme passent en lignes sur les petits écrans pour éviter de couper les mots.

Le contact sépare son introduction serveur du formulaire interactif. Thème, sujet et référence d’incident restent préremplis ; le thème établissement conserve sa liste de renseignements. Les noms de champs, limites de saisie, piège temporel, champ invisible et service de dépôt sont conservés. Les erreurs nomment leurs champs et le succès remplace le formulaire. Aucun message réel n’a été envoyé pendant cette vérification.

La recherche de certificat garde le même parseur de référence et la même navigation. Le document utilise une feuille craie, un statut valide ou révoqué explicite, puis les actions et métadonnées. Le nom figé à l’émission, le compte de missions figé, le numéro imprimé, l’empreinte entière, l’échéance et le motif de révocation sont conservés. Seul le titulaire d’un certificat non révoqué voit PDF et LinkedIn. Le partage copie le lien ; les gardes de recherche, redirection canonique et document inconnu restent au même endroit. Le chargement ne présente aucun statut de validité inventé.

## Vérifications et limites

- Catalogue réel : deux parcours ; modes visiteur et connecté. En visiteur, les deux cartes mènent à l’inscription. Filtre Cybersec : un résultat ; recherche sans résultat, puis remise à zéro : deux résultats. Aucun débordement à 320 px.
- Glossaire réel : 96 entrées, sept catégories, modes visiteur et connecté. Les ancres de catégorie et `/glossaire#dns` fonctionnent ; la définition ciblée prend le fond craie. Aucun débordement à 320 et 1280 px.
- Téléchargement réel : publication Android non configurée localement et web app iPhone ; les autres disponibilités sont couvertes par les tests de configuration. Aucun lien de boutique ni APK ouvert. Angles à zéro et absence de débordement à 320 px.
- Contact réel : sujet et thème préremplis, liste établissement visible, changement de thème dans le menu portalisé, police Space Grotesk et angles à zéro dans ce menu. Contrôle à 320 et 1280 px, sans soumission. Préremplissage d’incident, champs anti-spam, erreur de champ et succès couverts par des actions simulées.
- Recherche réelle : référence invalide annoncée avec `role="alert"`, champ marqué invalide ; petit écran sans débordement. Une référence inconnue ouvre bien l’état « Certificat introuvable ».
- Document valide, révoqué, titulaire et chargement rendus dans un aperçu temporaire authentifié, réservé au développement, portant la mention « certificat de test ». Aucun certificat écrit en base. Vues à 320 et 1280 px, aucun rayon non nul ni débordement ; PDF et LinkedIn absents du document révoqué et présents pour le titulaire d’un document valide. Copie du lien vérifiée par « Lien copié », sans publication externe.
- L’aperçu et sa donnée d’exemple sont supprimés après contrôle ; les copies de travail restent hors du dépôt. Les captures conservent la mention de test.
- 66 tests sur neuf fichiers : disponibilité et liens d’installation, cadres public/connecté, requêtes de support, préremplissage et erreurs du contact, références, nom et missions figés, numéro, empreinte, révocation, propriétaire et métadonnées du certificat. Les services et le presse-papiers sont simulés dans les tests unitaires ; aucun envoi d’e-mail ni téléchargement d’un vrai PDF certifié n’est revendiqué.
- TypeScript web, ESLint des surfaces modifiées, Biome et contrôle des espaces du diff. Aucun build global de production revendiqué.
- Revue React : les cadres, le glossaire, le téléchargement et le document restent serveur. Seuls les filtres et formulaires gardent leur état client. Pas de dépendance ajoutée, de fetch client ajouté, de service ou de règle d’autorisation modifiés.

Contrastes des matières communes : texte principal/carbone 16,48:1 ; texte atténué/carbone 7,67:1 ; texte gris/craie 6,29:1 ; encre/cuivre 6,42:1. Les états valide et révoqué sont nommés en texte, sans dépendre de leur couleur. Le cuivre sombre sur craie atteint 6,34:1 ; le focus utilise la couleur adaptée à sa matière.

## Gate Anti Slop

| Règle | Résultat et preuve |
| --- | --- |
| R-01 | PASS : surfaces unies de marque, anciens dégradés retirés des pages refaites. |
| R-02 | PASS : textes directs, aucune ponctuation interdite ajoutée. |
| R-03 | PASS : mesures et interactions à 320 px ; commandes de 44 px au minimum. |
| R-04 | PASS : emojis de la fausse capture retirés ; pictogrammes de plateforme et partage utiles conservés. |
| R-05 | PASS : catalogue, répertoire, formulaire et document ont des compositions propres à leurs contenus. |
| R-06 | PASS : typographie de marque ; monospace réservé au numéro et à l’empreinte du certificat. |
| R-07 | PASS : anciennes grilles d’ambiance retirées. |
| R-08 | PASS : flèches conservées seulement pour les liens externes d’installation. |
| R-09 | PASS : catégories et repères en texte ; pas de capsule décorative ajoutée. |
| R-10 | PASS : fonds mats, ancien verre du registre retiré. |
| R-11 | PASS : géométrie carrée, y compris menu portalisé et document. |
| R-12 | PASS : pas d’ombre flottante ajoutée. |
| R-13 | PASS : anciennes lueurs du registre retirées. |
| R-14 | PASS : lignes de définitions et de fonctions ; cases seulement pour comparer plateformes ou métadonnées. |
| R-15 | PASS : installer, envoyer, rechercher et copier nomment leur action. |
| R-16 | PASS : descriptions de fonctions existantes, pas de promesse chiffrée ajoutée. |
| R-17 | PASS : comptes du catalogue et du glossaire issus des données ; chiffres fictifs de téléphone retirés. |
| R-18 | PASS : aucun témoignage ajouté. |
| R-19 | PASS : titre du téléchargement en opacité pendant 180 ms ; transitions de contrôle brèves et réduction des mouvements prévue. |
| R-20 | PASS : affiche Bastion, répertoire typographique et feuille de certificat signent les tâches. |
| R-21 | PASS : thème de marque conservé. |
| R-22 | PASS : vrai logo, aucune fausse capture présentée comme le produit. |
| R-23 | PASS : actifs existants et données de test signalées ; aucun avatar ou client inventé. |
| R-24 | PASS : liens de carte selon le mode d’accès, ancres du glossaire et installation vérifiées ; destinations de certificat conservées. |
| R-25 | PASS : contrastes des matières calculés, focus prévu dans chaque surface. |
| R-26 | PASS : filtres, thèmes, validation et copie du lien vérifiés ; limites d’envoi et d’export précisées. |
| R-27 | PASS : absence de résultat et de disponibilité, erreurs, succès et chargement conservent une explication utile. |
| R-28 | PASS : aucune FAQ ajoutée. |
| R-29 | PASS : palette Bastion ; vert et rouge réservés à la validité réelle du certificat. |
| R-30 | PASS : aucune imitation d’un autre produit. |
| R-31 | PASS : craie pour données et document, cuivre pour action et repère de marque, couleurs de statut nommées. |
| R-32 | PASS : champs natifs, menu existant avec navigation clavier, focus et messages associés. |
| R-33 | PASS : sources éditées avec apply_patch, formatées avec Biome. |
| R-34 | PASS : un thème de marque ; réduction des mouvements inscrite dans les feuilles concernées. |
| R-35 | PASS : pages réelles et exemples exécutés, 66 tests ; pas de preuve de production inventée. |
| R-36 | PASS : aucune nouvelle promesse de sécurité ; le statut dit que le certificat figure dans le registre. |
| R-37 | PASS : DA existante et demande explicite d’angles droits. |
| R-38 | PASS : données réelles distinguées des exemples, faux chiffres de téléchargement retirés. |

C-1 PASS : chaque matière sert la comparaison, la lecture ou une action. C-2 PASS : comportements conservés, fonctions sensibles encadrées par leurs gardes existantes. C-3 PASS : contenu conservé, fausse interface retirée. C-4 PASS : mobile, erreurs et chargement contrôlés ; envoi réel et PDF réel exclus des preuves. C-5 PASS : chiffres issus des données ou clairement signalés comme exemples.

Dials conservés : ENERGY 3 par la typographie et les contrastes de matière ; RHYTHM 3 entre pages de choix, répertoire et document ; MOTION 2 pour une arrivée brève et des contrôles stables. Le point focal reste l’action de la page, et l’espacement se replie sans collision à 320 px.
