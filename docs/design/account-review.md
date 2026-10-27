# Vérification Compte

23 octobre 2026. Profil privé, profil public et sept sections de paramètres. Lecture de design : montrer l’identité et les acquis, puis permettre de régler le compte, dans la direction Bastion. ENERGY 3 / RHYTHM 3 / MOTION 2.

## Preuves et limites

- Navigateur local authentifié : trois onglets du profil, états vides réels, profil public, sept sections du tiroir et confirmation de suppression. Largeurs de 320, 768 et 1280 px ; pas de débordement observé sur les profils ni dans les sections à 320 px. Le titre et la progression utilisent Barlow Condensed après rechargement complet.
- Le changement de section conserve un brouillon de nom ; Annuler restaure la valeur initiale sans sauvegarde. La section active reste visible dans la navigation horizontale. L’aide contextuelle se ferme avec Échap sans fermer les paramètres. La confirmation de suppression s’ouvre et s’annule, avec un rayon nul et sans double marge intérieure.
- 130 tests web réussis sur 18 fichiers : paramètres, profils, accès publics, aide contextuelle et logique de profil. 42 tests UI réussis : ModalShell, SideDrawer et Select, dont restauration du focus et fenêtres superposées. TypeScript web/UI et ESLint des sources modifiées passent. Avertissements Node existants sur les configurations de module uniquement.
- Captures : `assets/profile.png`, `assets/public-profile.png`, `assets/settings.png`. Données locales réelles : aucun badge, aucune leçon terminée ni certificat ; les états remplis restent couverts par les tests existants et l’inspection des conditions.
- Aucun changement de mot de passe, MFA, confidentialité, export ou demande de suppression soumis dans le navigateur. Aucun fichier envoyé pour tester le recadrage. Les contrôles de ces opérations reposent sur les tests et la conservation des actions existantes ; ce document ne prétend pas les avoir exécutées contre les services externes.
- Revue React : lectures et gardes serveur conservées, pas de nouvelle frontière client pour le profil ou la progression. Le tiroir garde son chargement et ses brouillons. Les écouteurs de l’aide et du défilement de navigation sont nettoyés. SideDrawer conserve la maîtrise de son retour de focus ; ModalShell accepte ce choix.

## Raisons

Carbone pour l’identité et les formulaires, craie pour lire la progression et les certificats. Barlow Condensed donne de la présence aux titres ; Space Grotesk rend les formulaires lisibles. Les acquis ont leurs onglets plutôt qu’une longue collection imposée. Les chiffres viennent du compte. Les cibles de 44 px et le défilement de navigation permettent l’usage sur téléphone. Les fenêtres apparaissent sans déplacer leurs contrôles. Les couleurs de rareté et personnalisations sont des états du produit, conservés dans leurs emplacements.

## Gate Anti Slop

Verdicts limités à cette famille et aux preuves ci-dessus.

- R-02 PASS : les nouveaux titres et libellés n’introduisent pas de tiret cadratin.
- R-03 PASS : largeurs contrôlées, repli des profils et du tiroir sans débordement observé.
- R-17 PASS : niveau, XP, compteurs et historique issus des lectures conservées.
- R-18 PASS : aucun témoignage ajouté.
- R-23 PASS : avatars, badges et navigation existants réutilisés.
- R-24 PASS : liens de profil, certificats, leçons et paramètres gardent leurs destinations.
- R-25 PASS : couples Bastion réutilisés : encre/craie 14,78:1, secondaire/craie 6,29:1, cuivre clair/panneau 7,13:1.
- R-26 PASS : onglets, navigation, brouillon, annulation et fenêtres exercés ; actions couvertes par les tests.
- R-27 PASS : chargements représentatifs, états vides spécifiques et retours d’action conservés.
- R-28 PASS : aucune FAQ ajoutée.
- R-32 PASS : Échap, focus et fenêtres superposées couverts par tests et parcours navigateur.
- R-33 PASS : modifications dans les sources avec apply_patch, formatage Biome.
- R-34 PASS : thème de marque conservé, aucune bascule incomplète ajoutée.
- R-35 PASS : application exécutée et parcours consignés, 172 tests réussis ; limites explicites.
- R-36 PASS : aucune promesse de sécurité ou performance ajoutée.
- R-37 PASS : direction et cadrans hérités de la DA acceptée.
- R-38 PASS : compte local réel, aucun acquis fictif créé.
- R-01 PASS : nouveaux panneaux mats.
- R-04 PASS : icônes existantes liées aux avatars, acquis et actions.
- R-06 PASS : raisons typographiques écrites ci-dessus.
- R-07 PASS : calendrier réel d’activité ; aucun motif de fond ajouté.
- R-08 PASS : aucune flèche décorative répétée sur les nouveaux contrôles.
- R-09 PASS : états du compte et contrôles carrés, aucune capsule promotionnelle.
- R-10 PASS : tiroir et confirmation sans flou de fond.
- R-12 PASS : panneaux mats, sans ombre de carte généralisée.
- R-13 PASS : effets des cosmétiques limités à l’avatar existant.
- R-14 PASS : identité, progression, historique et réglages ont leurs compositions propres.
- R-19 PASS : motion brève et règles reduced-motion présentes ; aucune boucle ajoutée.
- R-22 PASS : aucune illustration générique ajoutée.
- Cadrans PASS : ENERGY 3 / RHYTHM 3 / MOTION 2 explicites.
- Cohérence PASS : titres forts, compositions utiles et fenêtres stables.
- Point focal PASS : identité sur profil, section active dans les paramètres.
- Espace structurel PASS : identité, acquis et réglages séparés sans chevauchement des actions.
- Accent PASS : cuivre pour sélection/action ; autres couleurs liées aux états existants.
- Motif PASS : titrage condensé, point cuivre et géométrie carrée.
- Design Read PASS : lecture de la famille écrite en ouverture.
- C-1 PASS : raisons des décisions majeures consignées.
- C-2 PASS : contrôles reliés aux actions existantes.
- C-3 PASS : sections liées au profil et aux opérations du compte.
- C-4 PASS : variantes et fenêtres testées ; limites des mutations non exécutées explicites.
- C-5 PASS : aucune donnée ou affirmation inventée.
- R-05 PASS : identité, historique et formulaires, sans composition marketing ajoutée.
- R-11 PASS : rayons nuls sur les contrôles et fenêtres inspectés.
- R-15 PASS : actions nommées, notamment Éditer le profil, Annuler et Télécharger l’export.
- R-16 PASS : texte fonctionnel, sans slogan technologique ajouté.
- R-20 PASS : vocabulaire et géométrie Bastion conservés.
- R-21 PASS : continuité du thème de la plateforme technique.
- R-29 PASS : carbone, craie, cuivre ; raretés et avatars gardent leurs données de personnalisation.
- R-30 PASS : aucune autre interface choisie comme modèle.
- R-31 PASS : palette, type, composition, espace et motion motivés ci-dessus.
