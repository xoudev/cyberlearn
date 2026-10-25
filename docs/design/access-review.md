# Accueil du compte : contrôle Bastion

24 octobre 2026. Connexion, inscription, récupération, MFA, identité, avatar, objectifs, test de positionnement et résultat. Direction existante : carbone, craie, cuivre, Barlow Condensed et Space Grotesk, angles droits. ENERGY 3 / RHYTHM 3 / MOTION 2.

## Choix de présentation

Le formulaire est la tâche principale. Sur grand écran, le cadre d’accès juxtapose une affiche craie et les champs sur carbone ; sur téléphone, l’affiche devient une bande de marque pour laisser les champs accessibles. Le vrai logo remplace les anciens habillages. Les boutons de visibilité restent à leur place et indiquent leur état avec `aria-pressed`.

Les trois étapes d’onboarding utilisent le même cadre serveur et une progression réelle de 1 à 3. Les avatars passent de quatre à deux colonnes. Les choix d’objectif restent des champs natifs ; la première suggestion est sur craie. L’absence de suggestion conserve son explication et l’accès au catalogue.

Le test conserve les champs `answer_<id>`, les choix obligatoires, le compteur et l’action existante. Le résultat montre les trois scores, leurs niveaux, les dispenses et le parcours recommandé. Les paramètres d’affichage sont lus avec Zod : une valeur non numérique, infinie ou répétée donne zéro, les pourcentages finis restent bornés entre 0 et 100. Ce traitement ne calcule aucun résultat et n’accorde aucune dispense ; cela reste la responsabilité du service existant.

La seule entrée animée du cadre d’accès dure 180 ms, sur son titre. Les contrôles restent fixes. Les transitions et animations sont coupées par `prefers-reduced-motion: reduce` dans les deux cadres.

## Preuves et limites

- Pages réelles de connexion, inscription et récupération inspectées à 320 px. Connexion du compte local vérifiée jusqu’au tableau de bord. Aucun compte créé, aucun e-mail envoyé, aucun mot de passe changé.
- Entrée réelle du positionnement : 15 questions, 12 minutes estimées. Questionnaire réel : 15 groupes et 60 radios, aucun débordement et aucun rayon non nul à 320 px. Aucun test soumis.
- Le compte ayant terminé l’onboarding, ses trois étapes ont été rendues dans un aperçu temporaire réservé au développement et authentifié, avec une mention de contrôle visuel et les soumissions neutralisées. Les questions et le résultat d’exemple portent la même mention. L’aperçu est supprimé après contrôle.
- À 320 px : identité, avatars, objectifs, suggestions vides et remplies, questions, résultat, connexion avec erreur, inscription, récupération, nouveau mot de passe et MFA sans débordement horizontal. Mesure de rayon à 0 px sur les éléments des cadres.
- Sélection d’avatar et réponses au clavier vérifiées. Espace sélectionne une radio, la flèche bas change le choix dans le même groupe, le compteur reste à une réponse et le focus encadre la réponse. Les boutons de visibilité fonctionnent avec Entrée sur connexion et inscription ; les trois formulaires sont couverts en tests.
- L’environnement local ne renvoie pas de suggestion pour la réponse « Dev / Je débute ». L’état rempli a donc été contrôlé avec deux parcours de test explicitement signalés, sans ajout en base.
- 80 tests dans 13 fichiers pour la famille : actions et gardes existantes, champs du questionnaire, remplacement d’une réponse, saisie obligatoire, questionnaire vide, affichage de scores invalides et boutons de visibilité. Ces tests simulent les services ; ils ne prouvent pas une inscription, une récupération par e-mail ou une validation TOTP complète.
- TypeScript web, ESLint de la famille, formatage Biome et contrôle des espaces du diff. Aucun build de production global revendiqué.
- Revue React : cadres et pages restent serveur ; seuls les formulaires conservent leur état navigateur. Aucun nouveau fetch client, dépendance, effet de synchronisation ou chargement de données. Les services, gardes, actions et règles d’authentification sont conservés.

Contrastes calculés : texte principal/carbone 16,48:1 ; texte atténué/carbone 7,67:1 ; gris/craie 6,29:1 ; encre/cuivre 6,42:1 ; cuivre sombre/craie 6,34:1. Les bordures de champ sur carbone atteignent 4,07:1. Le focus passe en cuivre sombre sur craie.

## Gate Anti Slop

Périmètre : cette famille, sans nouvelle fonction produit. Les absences ci-dessous sont des points non applicables à ses formulaires.

| Règle | Résultat et preuve |
| --- | --- |
| R-01 | PASS : matières unies de la DA, aucun dégradé ajouté. |
| R-02 | PASS : textes courts, aucune ponctuation interdite ajoutée. |
| R-03 | PASS : mesures à 320 px ; boutons de 44 à 50 px au minimum. |
| R-04 | PASS : pas d’emoji décoratif ; collection d’avatars existante conservée. |
| R-05 | PASS : affiche d’accès, étapes de profil et feuille de résultat répondent à des tâches différentes. |
| R-06 | PASS : typographie de marque ; chiffres tabulaires pour les résultats. |
| R-07 | PASS : anciens quadrillages retirés. |
| R-08 | PASS : pas de flèche ajoutée à chaque commande. |
| R-09 | PASS : métadonnées d’étape en texte, sans capsule. |
| R-10 | PASS : surfaces mates, anciens flous retirés. |
| R-11 | PASS : rayons calculés à zéro, y compris champs et sélection. |
| R-12 | PASS : pas d’ombre flottante ajoutée. |
| R-13 | PASS : anciennes lueurs retirées. |
| R-14 | PASS : cases égales pour comparer les avatars et les réponses ; pas de grille décorative. |
| R-15 | PASS : commandes nommées pour la connexion, le test et la récupération. |
| R-16 | PASS : textes de formulaire et d’orientation, aucune promesse marketing ajoutée. |
| R-17 | PASS : nombre et durée réels du test ; exemples signalés dans l’aperçu. |
| R-18 | PASS : aucun témoignage. |
| R-19 | PASS : titre d’accès à 180 ms, pas de boucle ; réduction des mouvements prévue dans les sources. |
| R-20 | PASS : logo et géométrie Bastion, hiérarchie propre à la tâche. |
| R-21 | PASS : thème existant de marque conservé. |
| R-22 | PASS : vrai logo et avatars existants, aucune illustration inventée. |
| R-23 | PASS : aucun actif ni destination produit inventés. |
| R-24 | PASS : destinations et actions conservées ; lien recommandé vérifié en test. |
| R-25 | PASS : contrastes calculés ci-dessus, focus visible contrôlé. |
| R-26 | PASS : connexion réelle, sélections et tests des actions ; limites de récupération et TOTP explicites. |
| R-27 | PASS : erreurs annoncées, validation en cours en texte, test indisponible sans bouton de départ, absence de suggestion conservée. |
| R-28 | PASS : aucune FAQ. |
| R-29 | PASS : palette Bastion ; couleurs des avatars existants conservées. |
| R-30 | PASS : aucune imitation d’un autre produit. |
| R-31 | PASS : craie pour comparaison et résultats, cuivre pour actions et focus, numéros pour les étapes réelles. |
| R-32 | PASS : champs natifs, sélection au clavier et focus visible. |
| R-33 | PASS : sources CSS/TSX éditées avec apply_patch, formatage avec Biome. |
| R-34 | PASS : un thème de marque ; réduction des mouvements inscrite dans chaque cadre. |
| R-35 | PASS : pages exécutées, preuves visuelles et tests ; pas de revendication de build global. |
| R-36 | PASS : aucune nouvelle affirmation de sécurité ou de performance. |
| R-37 | PASS : direction documentée et demande explicite de zéro arrondi. |
| R-38 | PASS : données réelles distinguées des exemples ; pas de métrique inventée en production. |

C-1 PASS : choix reliés aux formulaires, à la comparaison et à la marque. C-2 PASS : contrôles conservés et limites de tests précisées. C-3 PASS : habillage répété retiré, composition conduite par les étapes. C-4 PASS : petit écran, erreurs, focus et saisie native contrôlés. C-5 PASS : données réelles ou exemples signalés, aucune preuve de flux sensible inventée.

Dials conservés : ENERGY 3 par le contraste typographique, RHYTHM 3 entre accès, profil et résultats, MOTION 2 avec une arrivée brève et des états de contrôle stables. Le champ et l’action principale restent les points focaux ; les éléments de marque n’empiètent pas dessus.
