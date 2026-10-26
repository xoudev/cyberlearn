# Cohérence de marque : mails, connexion et favicons

Vérification du 26 octobre 2026, dans la continuité de la DA Bastion. Énergie 2, rythme 2, mouvement 1 ; aucune nouvelle animation.

## Corrections

- **Mails :** l'en-tête commun utilise un PNG de 600 × 120 px, affiché à 200 × 40 px. Le logo reprend les tracés Bastion ; le lettrage reprend Barlow Condensed 700 comme le site, avec son point cuivre. Le texte est vectorisé avant rasterisation pour éviter qu'un client mail remplace sa police. L'alternative textuelle est `CYBERLEARN.`.
- **Banc d'essai :** les quinze aperçus utilisent la copie locale de ce même PNG. Les mails envoyés gardent l'URL absolue du site. Le sandbox de l'iframe et la CSP restent inchangés. Les autres textes gardent les polices de repli prévues pour les clients mail.
- **Connexion admin :** un seul logo, dans la barre de 56 px. Cette barre reste « Console d'administration » sur bureau et « ADMIN » sur mobile. Les répétitions dans l'aside et le formulaire disparaissent ; les étapes de connexion et de MFA sont conservées.
- **Favicons :** les deux apps utilisent le même SVG transparent, avec un cadrage serré et des côtés en encre sur thème clair, en craie sur thème sombre. Le secours ICO est également transparent : le symbole passe de 16 × 18 à 30 × 32 px dans l'image de 32 px. Les icônes de lancement PWA gardent leur zone de sécurité.

Les assets se régénèrent avec `node apps/web/scripts/render-brand-assets.mjs`. Le script réutilise Sharp et le lecteur de fontes déjà présents dans Next et React PDF, sans nouvelle dépendance. La fonte [Barlow Condensed Bold](https://github.com/google/fonts/blob/main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf) est couverte par la licence OFL déjà fournie dans `apps/web/public/brand/fonts/OFL-BarlowCondensed.txt`.

## Contrôles

- 154 tests du package email, 6 tests d'assets et 384 contrôles admin/authentification passent.
- Lint et types passent : 15 tâches Turbo réussies, dont les packages requis ; formatage et `git diff --check` passent.
- Les builds de production web et admin passent avec webpack ; les serveurs de développement sont ensuite relancés sur 3000 et 3001.
- Les quinze sélecteurs de mail ont été parcourus dans le navigateur ; chaque aperçu contient l'en-tête commun. Le logo est visible dans l'iframe sans assouplir ses permissions.
- La connexion a été contrôlée à 1280 et 320 px : un seul logo, « ADMIN » visible sur mobile, aucun débordement. Le compte local traverse ensuite la connexion et la MFA obligatoire jusqu'au banc d'essai.
- Le banc d'essai a été contrôlé à 1600 et 320 px. Sur mobile, largeur utile et largeur défilante valent toutes deux 305 px ; le logo du mail reste dans le cadre.
- Les deux documents HTML référencent `/icon.svg` et `/favicon.ico` avec les nouvelles empreintes de contenu ; aucun lien ne pointe vers `Admin_logo.png` ou l'ancien `icon.png`.

Captures : [connexion bureau](assets/brand-login-desktop.png), [connexion mobile](assets/brand-login-mobile.png), [mail bureau](assets/brand-mail-desktop.png), [mail mobile](assets/brand-mail-mobile.png).

## Gate antislop, périmètre de cette correction

| Règle | Résultat et preuve |
| --- | --- |
| R-01 | PASS : aucune nouvelle surface en dégradé. |
| R-02 | PASS : contrôle typographique exécuté avant commit. |
| R-03 | PASS : captures et mesures à 320 px sans débordement horizontal. |
| R-04 | PASS : logo existant ; aucun pictogramme ajouté. |
| R-05 | PASS : shell de connexion et banc d'essai existants conservés. |
| R-06 | PASS : Barlow 700 du lettrage du site, vectorisé pour les mails. |
| R-07 | PASS : aucun motif de fond ajouté. |
| R-08 | PASS : aucune flèche décorative ajoutée. |
| R-09 | PASS : aucun badge décoratif ajouté. |
| R-10 | PASS : aucun effet de verre ajouté. |
| R-11 | PASS : aucun arrondi ajouté ; la suppression du fond du favicon est effective. |
| R-12 | PASS : aucune ombre ajoutée. |
| R-13 | PASS : aucune lueur ajoutée. |
| R-14 | PASS : aucune carte ajoutée. |
| R-15 | PASS : les commandes « Continuer » et « Valider » conservent leur fonction. |
| R-16 | PASS : aucun texte promotionnel ajouté. |
| R-17 | PASS : aucun compteur produit inventé. |
| R-18 | PASS : aucun témoignage ajouté. |
| R-19 | PASS : aucun mouvement ajouté, niveau 1 conservé. |
| R-20 | PASS : tracés Bastion partagés, lettrage Barlow et point cuivre. |
| R-21 | PASS : palette existante ; favicon adapté aux thèmes des onglets. |
| R-22 | PASS : aucune illustration ajoutée. |
| R-23 | PASS : reprise des assets de marque demandée, tracés comparés par les tests. |
| R-24 | PASS : seules les références aux assets et les libellés changent. |
| R-25 | PASS : marque en encre sur craie ; styles de champs et focus conservés. |
| R-26 | PASS : quinze sélecteurs de mail parcourus ; connexion et MFA traversées. |
| R-27 | PASS : erreurs, chargements et formulaires d'authentification conservés, tests passants. |
| R-28 | PASS : aucune FAQ ajoutée. |
| R-29 | PASS : aucune couleur hors de la palette Bastion ajoutée. |
| R-30 | PASS : identité existante réutilisée, aucune référence à un autre produit. |
| R-31 | PASS : chaque correction et sa raison sont expliquées ci-dessus. |
| R-32 | PASS : champs, boutons natifs et styles de focus conservés ; sélection par clavier disponible. |
| R-33 | PASS : sources modifiées par patch ; script limité à la génération d'assets. |
| R-34 | PASS : SVG avec variante de contraste sombre, pas de bascule de thème ajoutée. |
| R-35 | PASS : parcours navigateur des contrôles concernés, captures et tests exécutés. |
| R-36 | PASS : aucune nouvelle promesse de sécurité ou de conformité. |
| R-37 | PASS : DA Bastion existante, niveaux 2/2/1 conservés. |
| R-38 | PASS : exemples du catalogue inchangés, pas de contenu produit inventé. |
| C-1 | PASS : logo fixe en PNG pour les clients mail, SVG adaptatif pour les onglets. |
| C-2 | PASS : les commandes concernées fonctionnent et gardent leurs destinations. |
| C-3 | PASS : suppression des doublons, aucune section ajoutée. |
| C-4 | PASS : connexion et aperçu relus à 320 px ; sélecteurs de mail parcourus. |
| C-5 | PASS : mesures, tests et captures locaux cités ci-dessus. |
