# Extension de la refonte Bastion

Demande du 24 octobre 2026 : couvrir l’application web apprenant et toutes ses sorties visuelles, au-delà de l’inventaire des pages. Direction existante, angles droits, logo réel, carbone/craie/cuivre, Barlow Condensed et Space Grotesk. ENERGY 3 / RHYTHM 3 / MOTION 2.

## Phases

1. Inventaire des surfaces secondaires et sorties : réalisé, matrice et preuves dans [extensions-review.md](extensions-review.md).
2. E-mails transactionnels : implémentés, onze modèles et cinq variantes d’accès ; quinze rendus contrôlés à 320 px, aucun débordement ni rayon non nul, logo chargé. 139 tests e-mail passent.
3. Documents et images : implémentés et vérifiés. Certificat et version à noms longs sur une page ; fiche de révision de 72 points sur huit pages, douze sections et huit en-têtes retrouvés dans le PDF, huit pages inspectées. Images de profil publique et anonyme générées, cyrillique local sans appel HTTP externe ; icônes Bastion générées depuis le SVG. Polices présentes dans les traces de déploiement.
4. Fenêtres et interface secondaire : implémentées et vérifiées. Les deux confirmations natives du bloc-notes deviennent des ModalShell. Échap ferme d’abord le Select ouvert, puis le lecteur ; test de régression et vérification réelle faits. Niveau, bilan, dossier, lecteur et partage superposé contrôlés à 320 px ; aucun rayon ni débordement. Guide, recadrage, navigation mobile, amis, notifications, nouveautés et outils de leçon contrôlés avec les limites documentées. Les options Select ont la police commune et 44 px.
5. Contenu interactif des leçons : palette commune, diagrammes et OSINT adaptés ; moteurs et règles conservés. Les simulations pédagogiques et les cosmétiques équipés conservent leurs couleurs porteuses de sens.
6. Vidéos, vérification finale, documentation et nettoyage : réalisés. Les deux vidéos intégrées et leurs posters montrent les vrais écrans Bastion, avec données de démonstration signalées. Rendus et images extraites inspectés ; lecteur réel à 1280 et 320 px, sans commandes recouvertes par les cookies, Échap rend le focus. Suites permanentes : web 2 158 tests, UI 144, e-mail 139. Types web/UI/e-mail/marketing, lint web/UI/e-mail, formatage des 309 sources, diff et build web de production passent. Les limites de clients mail, données locales, opérations sensibles et intégration sont détaillées dans le rapport.

Les étapes antérieures et leurs preuves restent dans [l’audit des pages](redesign-audit.md). Cet audit ne constituait pas un inventaire exhaustif des fenêtres et sorties. La présente extension le complète.

Les exports de données Markdown et JSON conservent leurs formats portables, sans décoration. La console d’administration reste une application séparée ; les e-mails qu’elle envoie aux apprenants font partie du périmètre. Les composants partagés et sorties communes sont consignés dans MOBILE_PARITY.md.

Les PDF déjà émis sont des originaux dont l’empreinte SHA-256 est enregistrée. Leur stockage et leur téléchargement ne sont pas réécrits par cette refonte ; les nouvelles émissions utilisent le nouveau modèle. Modifier rétroactivement les originaux invaliderait leur empreinte.

## État livré

Branche `redesign`, modifications précédentes conservées. Aucun e-mail réel, certificat, progression ou contenu partagé créé pour la DA. Serveur de développement et Supabase locaux actifs.

Les aperçus `app/dev/extensions/`, `app/dev/email-preview/route.ts` et `test/design-extensions-render.test.tsx` ont été archivés hors du dépôt puis supprimés ; les types de routes ont été régénérés et les deux URL revérifiées en 404. Les rendus sont dans le dossier de travail externe `extensions` de cette conversation ; les captures choisies sont dans `docs/design/assets`. Le dialogue de dossier et le partage ont été contrôlés sans valider les écritures.

Les six phases sont réalisées. Le [rapport de couverture](extensions-review.md) porte les preuves, raisons, contrôles et gate Anti Slop R-01 à R-38 ; la DA et le registre de parité sont mis à jour. L’inventaire des routes ne remplace pas ce contrôle des fenêtres et sorties. Aucun commit ni push supplémentaire effectué dans cette extension.
