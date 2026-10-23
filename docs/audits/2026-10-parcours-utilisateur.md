# Audit des parcours utilisateur, octobre 2026

Rapport final du programme des 14 retours (point 25 du plan), daté du
22 octobre 2026. La passe dans le code a porté sur `main` à `9c1cab8b`
(#526). Depuis, seule #532 (`68e3363b`) a été fusionnée : elle corrige en
partie un constat (G.8), les autres sont inchangés.

## En bref

- **Les 78 constats des passes précédentes sont corrigés**, par les PR #484
  à #531, et chacun a été revérifié dans le code pendant cette passe. Trois
  restes mineurs sont notés plus bas.
- **Cette passe retient 62 constats distincts** : 1 P1, 17 P2 et 44 P3. Tous
  sont « à corriger » : une PR de correction suit ce rapport.
- **Le P1 est à traiter en premier** (C.1) : après une déconnexion globale,
  dont la simple déconnexion du site, les autres navigateurs du compte tournent
  en boucle de redirections jusqu'à une heure.
- **Pas fait dans cette passe** : le rejeu complet dans le navigateur aux
  quatre largeurs, et le balayage des 349 leçons. Voir « Méthode et limites ».
- **Reste à faire en production** : la conversion des anciennes révisions,
  `db:backfill-review-cards`, avant la version qui supprime
  `review_schedules_legacy`.

Gravité :

| Niveau | Sens |
|---|---|
| P1 | Une personne perd l'accès, des données ou sa progression, ou un parcours est bloqué |
| P2 | Un parcours est dégradé pour une partie des gens, avec un contournement |
| P3 | Gêne mineure, défaut d'affichage, ou écart aux règles du dépôt sans effet visible |

## Méthode et limites

**Passe dans le code.** Chaque parcours du point 25 du plan (A à F, puis la
console situation par situation) a été rejoué en lisant le code, de la page
jusqu'au repository, à 375, 768, 1280 et 1440 px. Les largeurs se calculent
à partir des feuilles de style, des marges et des polices. Une passe dédiée
aux quatre largeurs (R) et une recherche des angles morts (T) ont complété
l'ensemble. Chaque constat proposé a été soumis à trois relecteurs
indépendants, chargés de le réfuter :

- le premier relit le code ;
- le deuxième juge si un vrai utilisateur le voit ;
- le troisième vérifie les règles du dépôt et les décisions du plan.

Un constat n'est gardé qu'avec deux voix sur trois. La gravité retenue est
celle sur laquelle les relecteurs se sont accordés, et leurs corrections de
chiffres ou de portée sont reportées dans le texte. La même passe a revérifié
chaque constat des passes précédentes.

**Rejeu dans le navigateur.** Il n'a pas été fait dans cette passe : la base
locale ne pouvait pas y être migrée. Les migrations se lancent à la main, avec
la pile Supabase démarrée, et c'est au propriétaire de le faire.

Depuis, la base locale a été migrée et un premier rejeu a eu lieu le
22 octobre, sur `9c1cab8b`. Il a porté surtout sur le site à 375 px et sur la
console à 1280 et 375 px. Ses constats BR1 à BR5 recoupent des constats
confirmés ici :

| Constat du rejeu | Constat de cette passe |
|---|---|
| BR1 | T.3 |
| BR2 | R.6 |
| BR3 | T.4 |
| BR4 | B.4 |
| BR5 | E.1 |

BR6, BR7 et deux remarques sur la console, notées ici BR8 et BR9, n'ont pas
été soumis aux relecteurs : ils sont listés à part, en fin de liste.

Ce qui reste à faire dans le navigateur :

- le rejeu des six parcours et de la console aux quatre largeurs, en
  particulier à 768, 1280 et 1440 px côté site ;
- les vérifications prévues au plan :
  - schémas rendus en SVG ;
  - ateliers sans débordement ;
  - colonnes collantes stables ;
  - code validé au sixième chiffre avec retour à la page demandée ;
  - deux erreurs qui donnent deux ou trois cartes de révision ;
  - XP du rappel créditée une seule fois.

Pour relancer la pile locale, depuis la racine du dépôt :

```sh
npx supabase@2.64.0 start
pnpm --filter @cyberlearn/db exec prisma migrate deploy
pnpm --filter @cyberlearn/db db:seed
```

Les comptes de test (élève, élève avec TOTP, professeur, deux admins, deux
amis, un banni) se créent ensuite avec
`pnpm --filter @cyberlearn/db db:seed-local-accounts`. Les variables
d'environnement et les buckets sont décrits dans `docs/dev/local-stack.md`.

**Balayage des 349 leçons.** Pas relancé non plus. Il ouvre l'aperçu de chaque
leçon pour vérifier qu'elle se rend sans erreur, que ses schémas sont dessinés
et que ses ateliers tiennent dans leur cadre. Les jetons d'aperçu ont expiré,
et les prolonger dans la base locale revient au propriétaire. Le balayage reste
à faire avec le rejeu.

## Le programme

### Les 14 retours et leur réponse

| Retour (point du plan) | Réponse | PR |
|---|---|---|
| Colonnes latérales qui ne collent pas (1) | Colonnes collantes toujours armées, même plus hautes que l'écran | #464 |
| Notation dans un cadre dans un cadre (2) | Variante sans cadre, libellés partagés avec l'app | #467 |
| Contrôles morts : filtres du catalogue, boutons sans destination (3) | Vrais filtres Niveau et Statut ; chaque bouton mène quelque part | #465, #466, #471, #474, #499 |
| Ateliers qui débordent (4) | Ateliers tenus dans leur cadre, puis à la taille de leur bloc | #469, #509 |
| Schémas en texte brut (5) | Thème Mermaid en hexadécimal : les 240 schémas s'affichent de nouveau | #468 |
| Mise en page des leçons (6) | Option C : une colonne centrée, une barre d'outils, Plan et Notes en tiroirs | #482 |
| Navigation ; pages qui devraient être des fenêtres (7, 9, 12) | Fenêtres et tiroirs communs ouverts par l'adresse ; nouveautés, nouveau sujet, demande d'aide, « Défier » et examen blanc en fenêtres ; badges et certificats en onglets du profil, tournois en onglet de Défis ; registre des routes et barre latérale en cinq groupes | #478, #480, #508, #510, #520 |
| Révisions trop lourdes (8) | Rappel du jour (boîtes de Leitner, six questions, corrigé par le serveur), « Réviser ce module · 2 min », conversion puis retrait de la file SM-2 | #477, #502, #511, #522, #527 |
| Amis, classement, profil public (10, 11) | Classement de la semaine et du mois, marque d'ami, « Défier » et recherche @pseudo, « Tes amis », réponse depuis l'avis, profil public complet dans l'interface | #479, #483, #500, #505, #523 |
| Double authentification, console d'administration (13) | Code validé au sixième chiffre partout, gestes de support ; la console refaite (vague 6) | #470, #472, puis #476 à #532 |
| Audit de tout le parcours (14) | Trois passes, 78 constats corrigés, ce rapport | #484 à #496, ce document |

### Le plan, point par point

| Point | Objet | PR |
|---|---|---|
| 0a | Fins de ligne, pile Supabase locale et comptes de test | #463, #473 |
| 1 | Les schémas s'affichent de nouveau | #468 |
| 2 | Les colonnes collent | #464 |
| 3 | Les ateliers ne débordent plus | #469 |
| 4 | Notation du parcours, un seul cadre | #467 |
| 5 | Catalogue de leçons : filtres et compteurs | #466, #474 |
| 6 | Double authentification validée seule | #472 |
| 7 | Gestes de support qui débloquent un compte | #470 |
| 8a | Chaque bouton mène quelque part | #465, #499 |
| 8b, 8c | Notifications, réglages, accessibilité et confirmations | #471 |
| 9 | Fenêtre et tiroir communs | #478 |
| 10a | Nouveautés, nouveau sujet, demande d'aide sans quitter la page | #480 |
| 10b | Fenêtre « Défier », examen blanc présenté en fenêtre | #508 |
| 10c | Badges et certificats en onglets du profil, tournois en onglet de Défis | #510 |
| 11 | Registre des routes, barre latérale en cinq groupes partagés avec l'app | #520 |
| 12 | Journal des nouveautés 3.4 et 3.5 | #521 |
| 13 | Page de leçon centrée (option C) | #482 |
| 14 | Ateliers à la taille de leur bloc | #509 |
| 15a | Cartes de révision, à côté de l'ancien système | #477 |
| 15b | Rappel du jour sur le site, « Réviser ce module » | #502 |
| 15c | Rappel du jour et « Réviser ce module » dans l'app | #511 |
| 15d | Conversion de l'ancienne file (`db:backfill-review-cards`) | #522 |
| 15e | Retrait de l'ancienne file SM-2, table gardée jusqu'à la conversion | #527, #530 |
| 16 | Classement semaine et mois, liens publics, marque d'ami | #479, #500 |
| 17 | Panneau d'amis, « Défier », @pseudo, « Tes amis » | #523 |
| 18a | Profil public dans l'interface | #483 |
| 18b | Contenu du profil public, chiffres exacts, aperçu | #505 |
| 19a | Console sur les jetons du site | #476, #501, #524, #532 |
| 19b | Listes filtrées et paginées côté serveur | #481 |
| 19c | Un squelette fidèle par page | #507 |
| 19d | Toasts et recherche ⌘K | #512 |
| 20a | Studio de leçon, brouillon, versions, une seule fonction de publication | #526 |
| 20b | Erreurs MDX localisées à la ligne et à la colonne | #519 |
| 20c | Import et synchro avec diff et confirmation | #528 |
| 20d | Parcours, prérequis et refCode de la leçon | #513 |
| 21a | Fiche utilisateur 360 | #503 |
| 21b | Corrections d'XP, de série et de badges ; export RGPD dans `@cyberlearn/db` | #514, #531 |
| 21c | Tickets reliés au compte et au bannissement | #516 |
| 22 | Certificats : liste, révocation, rétablissement | #504 |
| 23a | Signalements et modération des contenus publiés | #517 |
| 23b | Journal d'audit filtré et exporté ; annonces | #481, #515 |
| 24 | Priorité 2 : référentiels, tâches planifiées, avis, disqualification, compte | #518 |
| 25 | Audit final | ce rapport |
| 26 | Journal des nouveautés 3.6 | #529 |

Hors plan, dans la même période :

- #487 : le labo à deux machines ;
- #497 : l'app lit les quiz comme le serveur ;
- #498 : un antislash perdu bloque l'enregistrement ;
- #506 : test mobile découpé ;
- #525 : journal d'audit et lectures par les repositories ;
- #530 : test du réglage des révisions.

## Constats des passes précédentes : tous corrigés

Les passes du 11 au 16 octobre avaient confirmé 78 constats (F01 à F62,
G01 à G13, H14 à H16). Cette passe a relu le code de chacun : tous sont
corrigés. Les constats de cette passe sont numérotés autrement, par parcours
(A.1, B.2…), pour ne pas les confondre.

### A. Visiteur anonyme

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| F01 | P1 | Parcours de classe sur le catalogue public et l'accueil | #488 |
| F02 | P1 | Numéro et adresse du certificat PDF invérifiables, quatre numéros différents selon l'écran | #489 |
| F03 | P1 | La vérification atteste le nom actuel du titulaire, pas celui du certificat | #489 |
| F04 | P2 | Toutes les pages déclarent la canonique et l'aperçu de l'accueil | #490 |
| F05 | P2 | La 404, le catalogue et le glossaire sortent un apprenant connecté de l'app | #490 |
| F06 | P2 | /u et /verify inconnus répondent 200 | #489 (/verify), #495 (/u) |
| F07 | P3 | /download : version périmée, disponibilités contradictoires | #490 |
| F08 | P3 | robots.txt ne bloque pas toutes les routes protégées | #490, puis registre des routes #520 |

### B. Premiers pas

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| F09 | P1 | Un seul compteur de 5 actions par IP pour toute l'authentification : une classe bloquée | #491 |
| F10 | P2 | Réinitialisation après 15 minutes : mot de passe actuel exigé, sans champ | #491 |
| F11 | P2 | Avatar remplacé par la photo GitHub à chaque connexion | #491 |
| F12 | P2 | « ← Retour » de l'étape Avatar inopérant | #492 |
| F13 | P2 | Résultat du test de positionnement contradictoire | #492 |
| F14 | P2 | Mail de confirmation qui demande un code que l'app ne sait pas lire | #491 |
| F15 | P2 | Aucune déconnexion possible pendant l'inscription | #492 |
| F16 | P3 | Formulaires vidés après une erreur | #491 |
| F17 | P3 | Erreurs de lien de /auth/confirm mal affichées | #491 |
| F18 | P3 | Première mission sans tenir compte des objectifs | #492 |
| F19 | P3 | Date du tableau de bord dans le fuseau du serveur | #492 |
| F20 | P3 | La vidéo de bienvenue ouvre la liste des leçons | #492 |

### C. Double authentification

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| F21 | P1 | Connexion avec code sans mise à jour du profil : effacement pour inactivité possible | #493 |
| F22 | P1 | App : « Utiliser un autre compte » laisse bloqué sur l'écran du code | #493 |
| F23 | P2 | App : écran de chargement à chaque nouveau jeton | #493 |
| F24 | P2 | Panneau « MFA inactif » pendant le chargement et en cas d'erreur | #493 |
| F25 | P2 | Désactivation d'un clic, sans code, administrateurs compris | #493 (le refus côté serveur n'est pas posé, voir « Laissé de côté ») |
| F26 | P3 | Échec de la désactivation renvoyé vers le tableau de bord | #493 |
| F27 | P3 | Console : /mfa et /mfa/setup en 404 pour un non-administrateur | #484 |

### D. Boucle d'apprentissage

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| F28 | P1 | Aperçu admin bloqué au premier quiz, « Terminer » qui crédite l'XP | #494 |
| F29 | P1 | Parcours de classe : certificat promis puis refusé | #488 |
| F30 | P1 | Leçon non publiée reliée à un parcours publié : carte, « Continuer », fin de parcours cassés | #488 |
| F31 | P1 | XP illimité par des identifiants d'exercice inventés | #494 |
| F32 | P2 | « Marquer terminé » valide la leçon dès la section 1 | #494 |
| F33 | P2 | « Leçon suivante » renvoie au parcours sans explication | #494 |
| F34 | P2 | Un exercice réussi rebloque sa section après « Précédente » | #494 (le cas du rechargement reste ouvert : D.5) |
| F35 | P2 | Notes : un échec affiché « Sauvegardé auto » | #494 |
| F36 | P3 | Révisions : le résultat d'une note jamais montré | #494, puis l'ancienne file retirée (#527) |
| F37 | P3 | Envoi automatique de l'examen relancé chaque seconde | #494 |
| F38 | P3 | PDF du certificat : accents perdus, identifiant mal formé en 500 | #489 |
| F39 | P3 | Titre d'un parcours fermé visible dans l'onglet | #488 |
| F40 | P3 | Titre de leçon affiché « ?. » | #494 |

### E. Social, compte, suppression, bannissement

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| F41 | P2 | /banned sans « Se déconnecter » une fois l'appel envoyé | #495 |
| F42 | P2 | Suppression : « Email envoyé » après un échec, demande bloquée une heure | #495 |
| F43 | P2 | Panneau Amis : lien vers un profil privé fermé | #495 |
| F44 | P2 | Ma classe (professeur) : lien vers un profil privé fermé | #495 |
| F45 | P2 | Notifications datées en minutes (« il y a 10 080 minutes ») | #495 |
| F46 | P3 | Panneaux Amis et Notifications : un échec remplace la page | #495 (le même motif reste ailleurs : T.5) |
| F47 | P3 | Données et suppression du compte au vouvoiement | #495 (d'autres vouvoiements restent : A.4) |
| F48 | P3 | Export : quota consommé avant la construction | #495 |
| F49 | P3 | /u inconnu répond 200 | #495 |
| F50 | P3 | Profil lu par un compte banni : boutons qui mènent à /banned | #495 |
| F51 | P3 | Ma classe (élève) : « Anonyme » sur sa propre ligne | #495 |
| F52 | P3 | Compte banni sans accès à l'export ni à la suppression | #495 |
| F53 | P3 | Forum : `path`, `locked` et `pinned` hors Zod | #495 |

### F. Application mobile

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| F54 | P1 | Tuile Certificats toujours à 0 | #489 |
| F55 | P1 | Leçons annoncées « débloquées automatiquement » jamais débloquées | #492 |
| F56 | P2 | Verrou des parcours contourné dans l'app | #494, #496 |
| F57 | P2 | Notification touchée dans la barre du téléphone sans destination | #496 |
| F58 | P3 | Échec du choix de visibilité au classement passé sous silence | #496 |
| F59 | P3 | Liens Markdown et `ExternalLink` en texte brut | #496 |
| F60 | P3 | Erreur de chargement des notifications prise pour une boîte vide | #496 (une constante morte reste : F.6) |
| F61 | P3 | Modules hors ligne lisibles par le compte suivant | #496 |
| F62 | P3 | Adresse de production écrite en dur | #489 |

### G. Console

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| G01 | P1 | Formulaires vidés ou remis aux valeurs enregistrées après un refus | #485 (le studio de #526 n'a plus de formulaire) |
| G02 | P2 | Supprimer un compte ou un badge mène à la 404 | #485 |
| G03 | P2 | Avertissements jamais affichés (e-mail non parti, sanction non appliquée) | #485 |
| G04 | P2 | Compte non administrateur : 404 partout, sans déconnexion | #484 |
| G05 | P2 | Challenges absents du journal d'audit | #485 |
| G06 | P2 | Réponse d'un demandeur invisible sur un ticket en cours | #485 |
| G07 | P3 | Titre d'onglet « Admin · Cyber Learn · Admin » | #484 |
| G08 | P3 | 404 en anglais, identifiant mal formé en 500 | #484 |
| G09 | P3 | Appel, ticket et file de modération sans lien vers le compte | #485 |
| G10 | P3 | Fil d'Ariane et recherche rapide qui ignorent des sections | #512 |
| G11 | P3 | Chiffres incohérents entre l'aperçu et les tickets | #485 |
| G12 | P3 | Sanction de la file de modération sans les garde-fous du bannissement | #485 |
| G13 | P3 | Statut de ticket : cast sans justification, résultat ignoré | #485 |

### H. Transverse

| ID | Gravité | Constat | Corrigé par |
|---|---|---|---|
| H14 | P2 | L'e-mail « double authentification réinitialisée » renvoie vers l'adresse noreply | #485 |
| H15 | P3 | Messages Zod en anglais sur le site et dans l'app | #486 |
| H16 | P3 | Prisma appelé hors des repositories (#470 à #481) | #525, #531 (le motif revient : A.6, B.6, G.8) |

### Restes relevés à la revérification

| Reste | Où | Statut |
|---|---|---|
| G09 : l'auteur d'une note signalée reste en texte brut, sans lien vers son compte | `apps/admin/app/(admin)/moderation/notes/page.tsx:24-35` | à corriger |
| G10 : le fil d'Ariane du studio `/lessons/[id]` n'affiche que « Leçons » | `apps/admin/lib/console-nav.ts` | à corriger |
| F60 : constante `TYPE_META` morte, avec des types qui n'existent plus | `apps/mobile/app/notifications.tsx:30-40` | à corriger (avec F.6) |

## Constats de cette passe

| Parcours | Proposés | Retenus (2 voix sur 3) | Après fusion des doublons | P1 | P2 | P3 |
|---|---|---|---|---|---|---|
| A. Visiteur anonyme | 7 | 7 | 6 | 0 | 1 | 5 |
| B. Premiers pas | 6 | 6 | 6 | 0 | 3 | 3 |
| C. Double authentification | 6 | 5 | 5 | 1 | 1 | 3 |
| D. Boucle d'apprentissage | 7 | 7 | 7 | 0 | 2 | 5 |
| E. Social, compte, suppression, bannissement | 10 | 10 | 9 | 0 | 2 | 7 |
| F. Application mobile | 6 | 6 | 6 | 0 | 1 | 5 |
| G. Console | 8 | 8 | 8 | 0 | 1 | 7 |
| R. Quatre largeurs | 13 | 13 | 10 | 0 | 4 | 6 |
| T. Angles morts | 5 | 5 | 5 | 0 | 2 | 3 |
| **Total** | **68** | **67** | **62** | **1** | **17** | **44** |

Un constat relevé dans deux parcours n'est décrit qu'une fois. Un renvoi
l'indique dans l'autre parcours.

**Ordre de correction proposé** :

1. C.1 ;
2. les P2 qui font perdre du travail ou une information : A.1, D.2, E.2,
   T.1 et T.2 ;
3. les autres P2 ;
4. les P3, groupés par fichier.

### A. Visiteur anonyme

Relu : accueil, catalogue, glossaire, pages légales, contact, téléchargement,
profils publics et liens vers `/u/`, vérification de certificat, robots.txt,
registre des routes, sitemap, 404 et pages d'erreur.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| A.1 | P2 | toutes | Un refus du formulaire de contact efface tout ce que le visiteur a écrit | `apps/web/app/contact/page.tsx:157` | à corriger |
| A.2 | P3 | toutes | Le pied de page de l'app envoie l'apprenant connecté sur les pages de visiteur /download et /contact | `apps/web/components/footer.tsx:17` | à corriger |
| A.3 | P3 | 375 | Sur téléphone, l'accueil, le catalogue et le glossaire n'ont aucun lien « Connexion » | `apps/web/app/globals.css:3583` | à corriger |
| A.4 | P3 | toutes | Messages de limite au vouvoiement, au milieu d'écrans qui tutoient | `apps/web/lib/tickets/requester.ts:74` | à corriger |
| A.5 | P3 | 375, 768 | Liens des pages publiques trop petits au doigt, dont la seule sortie d'un profil partagé | `apps/web/app/u/[username]/public-profile.css:39` | à corriger |
| A.6 | P3 | toutes | Le formulaire de contact écrit le ticket par Prisma, hors du repository (règle 8) | `apps/web/lib/tickets/requester.ts:79` | à corriger |

Relevé aussi dans ce parcours : le nom d'un auteur de solution au profil privé
qui mène à une 404 (E.5).

**A.1.** Le visiteur a écrit jusqu'à 5 000 caractères. Un refus du serveur
affiche une erreur et vide l'adresse et le message ; le thème reste affiché
mais le champ envoyé repart vide. Trois refus sont possibles :

- une adresse comme « jean@gmail », que le navigateur accepte et que le
  serveur refuse ;
- un objet ou un message trop court une fois les espaces retirés ;
- la limite de 3 envois par 10 minutes et par IP, vérifiée après la
  validation.

Cette limite est partagée par tout un établissement, et avec la fenêtre
« Nouvelle demande » des comptes connectés. React 19 vide un formulaire non
contrôlé après chaque action, et `ContactFormState` ne renvoie aucune saisie.
C'est le défaut que #491 a corrigé sur la connexion, l'inscription et
l'identité.

**Correctif :** renvoyer `values: { email, theme, subject, message }` dans
l'état en cas de refus. Les remettre en `defaultValue`, avec une `key` liée à
l'état, thème compris. Ajouter un test de l'action sur un refus de limite.

**A.2.** « Application mobile » fait sortir l'apprenant de l'app : il perd la
barre latérale et se voit proposer « Connexion » et « Commencer gratuitement ».
« Contact » ouvre le formulaire des visiteurs, qui lui fait retaper son
adresse, alors que la fenêtre « Nouvelle demande » répond à l'adresse du
compte. Le dossier reste rattaché au compte : seule la copie par e-mail part à
l'adresse tapée. La page d'erreur de l'app mène aussi à /contact
(`app/(app)/error.tsx:107`). C'est contraire au point 10a du plan (« fini le
détour par /contact »).

**Correctif :**

- /download reprend le layout du catalogue : AppShell pour un compte connecté
  non banni, sans « Ouvrir sur le web ».
- Le « Contact » de `app/(app)/error.tsx` mène à `?request=1`.
- Celui du pied de page aussi, mais par une prop passée par AppShell : le
  même Footer sert à /legal et /privacy pour les visiteurs.

**A.3.** Le lien « Connexion » de la barre publique est masqué sous 480 px.
Un apprenant dont la session a expiré (nouvel appareil, cookies effacés) ouvre
cyberlearn.fr sur son téléphone : seul « Commencer », l'inscription, lui est
proposé. Il doit passer par la page d'inscription, puis par « J'ai déjà un
compte ». /download garde « Ouvrir sur le web ».

**Correctif :** garder une entrée de connexion sous 480 px, avec un libellé
court ou un lien dans le haut de l'accueil. Vérifier que la barre tient dans
les 343 px utiles à 375.

**A.4.** Plusieurs messages vouvoient :

- « Trop de demandes. Réessayez dans 540 secondes. » sur /contact, dans
  « Nouvelle demande » et dans l'app ;
- « Réessayez dans une minute. » sur les solutions et les questions de leçon
  (`lib/challenges/writeups.ts:70`, `lib/lessons/qa.ts:57`) ;
- « Réessayez plus tard. » sur un défi (`lib/challenges/play.ts:128`) ;
- « Vérifiez l'authenticité… » dans la description de /verify montrée par les
  moteurs (`app/verify/page.tsx:9`), quand la page dit « Entre le numéro ».

Le site a choisi le tutoiement : les tests de tutoiement des écrans de compte
et des mails le gardent depuis #495. Le délai vaut au plus 600 secondes.

**Correctif :**

- « Réessaie dans N min. », avec un délai arrondi en minutes ;
- « Réessaie dans une minute. » et « Réessaie plus tard. » ;
- « Vérifie l'authenticité d'un certificat CyberLearn. » ;
- mettre à jour `requester.test.ts:87` et `request-actions.test.ts:48` ;
- ajouter `lib/tickets`, `lib/challenges`, `lib/lessons/qa.ts` et
  `app/verify` au test de tutoiement.

**A.5.** Sur un profil ouvert depuis un lien partagé, le seul lien vers le
site (« ← cyberlearn ») est un texte de 11 px, d'environ 16 px de haut. Même
hauteur pour les liens du pied de page (pages légales, toute l'app) et du pied
de l'accueil (10,5 px). Le glossaire, les pilules du catalogue et le bouton
Application font 30 à 42 px : au-dessus du minimum WCAG AA (24 px), sous les
44 px recommandés au doigt.

**Correctif :** `min-height: 44px; display: inline-flex; align-items: center`
(ou une marge verticale) sur `.pp-standalone__home`, les liens du Footer et
`.footer-link`.

**A.6.** Rien de visible. `fileTicket` fait `prisma.contactTicket.create` et
`replyAsRequester` fait `prisma.contactTicket.findFirst` (l.161), alors que
`ticketRepository` porte déjà les réponses. `lib/moderation/ban-appeal.ts:79`
crée lui aussi un ticket en direct.

**Correctif :** un `ticketRepository.create(...)` et une lecture de propriété
(ou `findForRequester`), appelés par `fileTicket`, `replyAsRequester` et
`ban-appeal.ts`. Adapter `requester.test.ts`.

### B. Premiers pas

Relu : inscription par e-mail et par GitHub, confirmation, connexion, mot de
passe oublié, les trois étapes de l'inscription, test de positionnement (site
et app), premier tableau de bord, première leçon, premier XP et première série.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| B.1 | P2 | toutes | Une connexion sur le site compte comme le jour de série : la leçon faite ensuite n'allonge plus la série | `packages/db/src/repositories/user.repository.ts:433` | à corriger |
| B.2 | P2 | toutes | Test de positionnement : « Passer · aller au tableau de bord » renvoie le nouvel inscrit à l'étape Avatar | `apps/web/app/(auth)/onboarding/placement-test/questions/_components/placement-test-form.tsx:492` | à corriger |
| B.3 | P2 | 375 | Test de positionnement : la page défile en largeur sur téléphone | `apps/web/app/(auth)/onboarding/placement-test/result/page.tsx:486` | à corriger |
| B.4 | P3 | 375, 768 | Connexion et inscription : liens secondaires et bouton « Afficher » d'environ 14 px de haut | `apps/web/app/(auth)/_components/auth-shell.module.css:312` | à corriger |
| B.5 | P3 | 375 | Étape Identité : « ◌ En attente » ne vérifie rien et réduit le champ à 9 caractères visibles | `apps/web/app/(auth)/onboarding/_components/onboarding-form.tsx:275` | à corriger |
| B.6 | P3 | toutes | Pages de l'inscription et tableau de bord : lectures Prisma directes (règle 8) | `apps/web/app/(auth)/onboarding/page.tsx:30` | à corriger |

**B.1.** Un exemple sur deux jours :

1. Jour 1 : l'élève finit sa première leçon, la série passe à 1.
2. Jour 2 : il se reconnecte sur un poste de la classe, puis finit une leçon.
   L'XP est créditée et le jour s'allume dans la semaine, mais la série
   affiche toujours « 1 jour d'affilée ». La quête et les badges de série
   n'avancent pas.

Qui se reconnecte à chaque séance (poste partagé, navigation privée) reste
donc à 1. À l'inverse, une connexion sans activité empêche le cron de casser
une série. Cause : `upsertFromAuth` écrit `lastActiveAt` à chaque connexion
sur le site (mot de passe, GitHub, lien, code MFA). Or cette colonne sert de
dernier jour de série à la fin de leçon (`complete.ts:137-145`), au rappel du
jour (`daily-recall.ts:295`), aux défis (`challenges/play.ts:203`) et au cron
`streak-reset`. L'app n'est pas touchée.

**Correctif :** une colonne propre au jour de série, par exemple
`streakLastActiveAt`, initialisée par migration depuis `lastActiveAt`.

- Seules les activités qui comptent l'écrivent : leçon, rappel, défi,
  correction depuis la console, gel du cron.
- `registerActivity`, `applyDayBoundary` et le cron la lisent.
- `lastActiveAt` garde son rôle pour l'avis d'inactivité.

**B.2.** Le nouvel inscrit ouvre le test, choisit « Passer » et retombe à
l'étape 2. Il doit refaire Avatar et Objectif, puis « Passer, j'explore
seul ». Pourquoi :

- le lien mène simplement à /dashboard, alors que l'inscription n'est pas
  finie : `finishGoals` redirige vers le test avant `setOnboardingComplete` ;
- le middleware renvoie alors vers /onboarding, qui renvoie à l'avatar.

L'écran d'intro et l'app terminent l'inscription quand on passe : c'est aussi
un écart de parité (`docs/MOBILE_PARITY.md:68`).

**Correctif :** un `<form action={skipOnboarding}>` avec le même libellé,
comme sur l'écran d'intro. Dans `questions/page.tsx:20`, terminer
l'inscription avant de rediriger quand le test n'a aucune question active.

**B.3.** Sur un téléphone de 360 à 412 px :

- l'écran de résultat glisse sur le côté : les deux boutons font environ
  565 px côte à côte pour 311 disponibles, et « Explorer les leçons » est
  hors de l'écran ;
- l'intro et les questions débordent de 20 à 35 px, à cause des grilles de
  quatre chiffres, et le texte de « Passer → accéder au dashboard » dépasse
  de son bouton ;
- à l'étape Avatar, « Continuer » sort de sa carte.

Ces pages gardent des marges en ligne de 32 à 36 px, sans la réduction mobile
de l'étape 1 ni celle d'OnboardingShell.

**Correctif :**

- la classe `onboarding-content` sur ces conteneurs, et des marges de carte
  réduites sous 640 px, comme OnboardingShell ;
- `flexWrap: "wrap"` sur la rangée de boutons du résultat ;
- des grilles en `repeat(2, minmax(0, 1fr))` sous 640 px.

**B.4.** Avec `.link` (10 px, sans marge), plusieurs liens font environ 15 px
de haut :

- « Mot de passe oublié », « Créer un compte » et « J'ai déjà un compte » ;
- « Demander un nouveau lien » et « Renvoyer l'e-mail de confirmation »
  (`resend-confirmation.tsx:30`) ;
- « Annuler et se déconnecter » sur /mfa.

« Afficher » et « Masquer » (`.reveal`, 9 px) font environ 13 px et sont posés
dans le champ : un toucher raté met le focus dans le champ au lieu d'afficher
le mot de passe. C'est le constat BR4 du rejeu.

**Correctif :** `min-height: 44px; display: inline-flex; align-items: center`
sur `.link` et `.reveal`, avec une marge horizontale pour `.reveal`.

**B.5.** Le libellé est fixe et laisse croire qu'une vérification de
disponibilité est en cours : elle n'a lieu qu'à l'envoi. À 375 px, il prend
environ 122 px et ne laisse que 9 caractères visibles au champ, qui en accepte
32. Le texte d'exemple « mon-pseudo » est coupé.

**Correctif :** retirer le libellé, ou le masquer sous 640 px, et réduire la
marge de la carte sous 640 px comme OnboardingShell.

**B.6.** Rien de visible. On trouve des lectures directes à plusieurs
endroits :

- `onboarding/page.tsx:30`, `avatar/page.tsx:19` et `goals/page.tsx:37` ;
- `placement-test/page.tsx`, aux lignes 18, 26 et 29 ;
- 14 sur `dashboard/page.tsx`, aux lignes 88 à 160, 203 et 237 ;
- les services `lib/onboarding/steps.ts` et `placement.ts`.

#525 a commencé ce déplacement. 13 des 60 pages du site ont encore ce motif.

**Correctif :** déplacer ces lectures :

- le profil d'inscription dans `userRepository` ;
- le résultat et le nombre de questions actives dans `placementRepository` ;
- les lectures du tableau de bord dans un repository dédié.

### C. Double authentification

Relu : connexion avec code et retour à la page demandée, validation au sixième
chiffre, garde du site, GitHub et liens d'e-mail, activation et désactivation,
console (connexion, code obligatoire, écran « accès réservé »), réinitialisation
par un administrateur et son e-mail, fermeture des sessions, app.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| C.1 | P1 | toutes | Après une déconnexion globale, les autres navigateurs tournent en boucle entre /login et /dashboard jusqu'à une heure | `apps/web/middleware.ts:358` | à corriger |
| C.2 | P2 | toutes | Téléphone perdu : l'écran du code n'indique aucun recours, et la page de contact renvoie vers /mfa | `apps/web/middleware.ts:376` | à corriger |
| C.3 | P3 | toutes | Console : la réinitialisation est proposée pour une activation jamais terminée et envoie un e-mail d'alerte faux | `apps/admin/app/(admin)/users/[id]/page.tsx:263` | à corriger |
| C.4 | P3 | 375, 768 | « Annuler et se déconnecter » : cible d'environ 13 px sur les écrans de code | `apps/admin/app/admin-ui.css:1479` | à corriger |
| C.5 | P3 | toutes | Code refusé après l'envoi automatique : le message n'est pas annoncé aux lecteurs d'écran | `apps/web/app/(auth)/mfa/mfa-challenge-form.tsx:95` | à corriger |

**C.1.** La personne ne voit jamais la page de connexion. Cela touche :

- le titulaire d'un compte dont le support a fermé les sessions (« Déconnecter
  toutes les sessions », téléphone perdu) ;
- tout autre navigateur d'un compte qui vient de se déconnecter.

/, /login, /register, /forgot-password et toute page de l'app finissent en
`ERR_TOO_MANY_REDIRECTS`. Cela dure jusqu'à l'expiration du jeton, une heure
(`jwt_expiry` de `supabase/config.toml:51`), sauf si elle efface ses cookies.
La console promet l'inverse : « Le site et l'app redemandent la connexion dès
la page suivante » (`access-actions.ts:288`).

Le déclencheur est banal : la déconnexion du site (`sidebar-nav.tsx:266`)
comme celle des réglages de l'app (`apps/mobile/app/settings.tsx:381`)
appellent `signOut()` en portée globale. Se déconnecter sur un appareil met
donc en boucle les navigateurs où le même compte est ouvert. Le mécanisme :

- le middleware lit la session dans le cookie (`getSession`, sans appel
  réseau), puis renvoie un compte « connecté » de /login vers /dashboard
  (l.429-440) ;
- le layout `(app)` vérifie la session par le réseau (`getUser`) et renvoie
  vers /login ;
- le cookie périmé n'est jamais effacé, puisqu'un Server Component ne peut
  pas l'écrire.

**Correctif :** avant de renvoyer un compte loin de /login, /register,
/forgot-password ou de l'accueil, vérifier la session par `getUser()`, borné
par `withTimeout`. S'il n'y a personne, laisser passer la requête : cela
efface les cookies. Ajouter un test du middleware : cookie valide et `getUser`
nul, sur /login.

**C.2.** L'écran « Code de sécurité » ne propose que « Valider le code » et
« Annuler et se déconnecter » sur le site, « Utiliser un autre compte » dans
l'app. Rien ne dit que le support peut retirer le facteur, alors que ce
recours a été créé pour ce cas (#470).

La porte du middleware sur le niveau d'authentification passe avant les
routes publiques : /contact, l'accueil, /legal et /privacy renvoient vers
/mfa une session qui doit son code. Il faut deviner qu'on doit d'abord se
déconnecter, ce qui ferme aussi les autres sessions sur le site (C.1).

**Correctif :** laisser /contact, /legal et /privacy hors de cette porte.
Sous le formulaire, sur le site et dans l'app, ajouter « Tu n'as plus accès
à ton application d'authentification ? », qui mène à
`/contact?theme=SECURITY&subject=…`, le préremplissage de
`securityContactUrl`.

**C.3.** La fiche affiche « Inactive · 1 activation commencée, jamais
terminée », et juste en dessous la carte « Réinitialiser la double
authentification » est offerte. L'apprenant reçoit alors un e-mail qui ne
correspond à rien, puisqu'il n'a jamais eu de facteur actif :

- « Ta double authentification a été réinitialisée » ;
- « Tu n'as rien demandé ? Change ton mot de passe tout de suite ».

La carte annonce aussi « ses sessions ouvertes sont fermées », ce qui n'arrive
qu'avec un facteur vérifié.

**Correctif :**

- n'offrir la réinitialisation que si `verifiedTotp > 0` ;
- laisser la prochaine activation nettoyer les facteurs abandonnés, ou les
  retirer sans e-mail ;
- n'écrire la phrase sur les sessions que si un facteur vérifié existe.

**C.4.** Sur les écrans de code de la console (/mfa et /mfa/setup),
`.a-auth-cancel` fait 10 px, sans marge, et n'a que la largeur du texte. Sur
le site, le même bouton porte `.link` (B.4). C'est la seule façon de se
déconnecter depuis ces écrans.

**Correctif :** `min-height: 44px; display: inline-flex; align-items: center`
sur `.a-auth-cancel`. Le site suit B.4.

**C.5.** Le code part seul au sixième chiffre. En cas de refus, le message
s'affiche dans un paragraphe sans `role="alert"` ni `aria-live`, à quatre
endroits :

- sur le site ;
- dans la console, `admin-mfa-challenge.tsx:79` ;
- à l'activation dans la console, `admin-mfa-setup.tsx:139` et `199` ;
- dans le panneau d'activation du site, `security-panel.tsx:524`.

Une personne qui utilise un lecteur d'écran n'entend rien et ne sait pas que
la connexion a échoué. L'app, elle, annonce l'erreur. Critère WCAG 4.1.3.

**Correctif :** `role="alert"` sur ces paragraphes, comme dans `login-form.tsx`
et dans l'app.

### D. Boucle d'apprentissage

Relu : page de leçon (option C), chaque composant rendu par le MDX et les
ateliers de #509, fin de leçon, XP et exercices, rappel du jour et « Réviser ce
module », redirections de /revisions, parcours et modules, examens, certificats.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| D.1 | P2 | 375, 768 (fin de ligne à 1280 et 1440) | La définition d'un mot du glossaire est coupée au bord de l'écran | `apps/web/app/globals.css:1192` | à corriger |
| D.2 | P2 | toutes | Examen final et examen blanc : une coupure réseau à la remise bloque l'écran, et les réponses sont perdues au rechargement | `apps/web/app/(app)/paths/[slug]/exam/_components/exam-flow.tsx:204` | à corriger |
| D.3 | P3 | toutes | Labo à deux machines : « Réinitialiser les deux machines » ressemble à une ligne de texte | `apps/web/app/(app)/lessons/[slug]/_components/two-machine-lab.tsx:31` | à corriger |
| D.4 | P3 | 1280, 1440 | Labo à deux machines : terminaux d'une trentaine de colonnes quand les notes sont ancrées | `apps/web/app/(app)/lessons/[slug]/_components/two-machine-lab.tsx:39` | à corriger |
| D.5 | P3 | toutes | Une leçon en cours repart de la section 1 après un rechargement, et un exercice réussi bloque de nouveau sa section | `apps/web/app/(app)/lessons/[slug]/page.tsx:146` | à corriger |
| D.6 | P3 | 375 | Barre d'outils de la leçon : Précédente, Suivante, Plan et Notes sont des cibles de 34 px | `apps/web/app/(app)/lessons/[slug]/_components/lesson-toolbar.tsx:135` | à corriger |
| D.7 | P3 | toutes | Terminal simulé : « Vouliez-vous dire » vouvoie l'apprenant | `apps/web/app/(app)/lessons/[slug]/_components/simulated-terminal.tsx:659` | à corriger |

**D.1.** L'infobulle part du bord gauche du mot et s'étend vers la droite, sur
300 à 320 px. `<main>` coupe ce qui dépasse :

- à 375 px, tout mot qui commence après environ 75 px a une définition
  tronquée, illisible même en défilant ou en zoomant ;
- à 768 px, c'est le cas des mots placés dans les 40 % de droite de la
  colonne.

**Correctif :**

- sous 768 px, un panneau fixe en bas de l'écran (`position: fixed; left:
  16px; right: 16px; bottom: 16px; width: auto`), toujours sans script ;
- au-delà, `max-width: min(320px, calc(100vw - 32px))`, et un ancrage à
  droite pour un mot en fin de ligne.

Attention aux Callout : `.lesson-block` y est un conteneur, et c'est lui qui
devient la référence d'un `position: fixed`.

**D.2.** L'apprenant clique « Terminer l'examen » au moment d'une coupure. Le
bouton reste grisé sur « Envoi… », sans message, et le chrono continue.
Ensuite :

- s'il recharge, la tentative reprend avec des réponses vides ;
- s'il ne recharge pas, l'envoi automatique de 0:00 ne part pas, et la
  tentative expire en échec : score 0, puis le délai d'attente.

Les appels `await` sont sans try/catch : `submitQuizAttempt`,
`startQuizAttempt` (l.247) et `submitMockExamAction` (`mock-exam-flow.tsx:740`).
Pourtant, `start()` de l'examen blanc a déjà le sien.

**Correctif :** un try/catch autour des trois appels.

- Remettre à faux l'état d'attente et la garde d'envoi.
- Afficher « Envoi impossible : vérifie ta connexion, tes réponses sont
  gardées. »
- Laisser le bouton pour réessayer.

**D.3.** Le bouton est un `<button>` sans classe. Le preflight de Tailwind le
rend sans fond, sans bordure et sans marge, entre la consigne et les
terminaux : on ne le repère pas, et sa zone de toucher fait une ligne de
texte. Il apparaît dans la leçon blue team 13 et dans la vitrine.

**Correctif :** `className="btn btn--ghost btn--sm"`, avec une icône de remise
à zéro comme les autres ateliers.

**D.4.** La grille passe à deux colonnes selon la largeur de l'écran
(`xl:grid-cols-2`), pas selon celle du bloc. Les deux cas extrêmes :

- notes ancrées (400 ou 560 px) : chaque terminal fait environ 328 ou 248 px,
  soit 38 ou 28 colonnes, moins que sur un téléphone ;
- entre 1024 et 1279 px : les terminaux s'empilent en pleine largeur.

C'est le seul composant de leçon resté sur un point de rupture d'écran après
#509.

**Correctif :** une classe, et `@container lesson-block (min-width: 900px)`
pour les deux colonnes, sur le modèle de `php-lab.css`.

**D.5.** Arrêté à la section 6, l'apprenant revient le lendemain : la leçon
s'ouvre sur la section 1, et le Plan grise les suivantes. Il doit cliquer
« Suivante » section par section. Il doit aussi relancer chaque
PythonChallenge déjà réussi, Pyodide compris, alors que la réussite est
enregistrée sur le serveur. Ampleur :

- 291 leçons ont au moins sept sections ;
- 51 leçons comptent 65 PythonChallenge.

C'est la part de F34 restée ouverte ; dans la page, #494 l'a corrigée. Aucun
CodePlayground du contenu n'a de `validate` : ceux-là ne bloquent rien.

**Correctif :**

- lire les exercices déjà enregistrés de la leçon (`exerciseRepository`)
  pour amorcer l'état « fait » ;
- amorcer la section la plus loin atteinte avec la dernière section dont les
  quiz ont une réponse et les exercices sont faits.

**D.6.** Sur téléphone, quatre icônes d'environ 36 × 34 px, à 6 px l'une de
l'autre par paire. Dans le tiroir des notes, plein écran sur téléphone, les
boutons de mise en forme font 30 × 28 px et « Agrandir » 28 × 28 px
(`note-drawer.tsx:74` et `487`). C'est au-dessus du minimum WCAG AA, mais
sous les 44 px recommandés au doigt.

**Correctif :** `@media (pointer: coarse) { .lesson-toolbar .btn { height: 44px;
min-width: 44px } }`, qui tient dans la barre de 48 px. Même règle pour les
boutons du tiroir, passés en classe.

**D.7.** Après une faute de frappe proche d'une commande connue, le terminal
affiche « Vouliez-vous dire : ls ? », alors que le même terminal dit « Tape
help ». 145 leçons l'utilisent.

**Correctif :** « Tu voulais dire : <commande> ? », et ce cas dans le test du
terminal.

### E. Social, compte, suppression, bannissement

Relu : panneau Amis, « Défier », « Tes amis », classements, forum, questions de
leçon, solutions, signalements et contenus masqués, notifications, réglages,
export RGPD, suppression du compte, bannissement et appel, tickets côté
apprenant, parité mobile.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| E.1 | P2 | 375 (tout écran sous ~500 px) | Panneaux Amis et Notifications coupés à gauche sur téléphone | `apps/web/app/globals.css:6050`, `apps/web/components/notification-panel.tsx:273` | à corriger |
| E.2 | P2 | toutes | Appel d'un bannissement : la réponse n'arrive jamais si « Avis par email » est coupé, et /banned affiche « transmis » pour toujours | `apps/admin/app/(admin)/_actions/ticket-actions.ts:114` | à corriger |
| E.3 | P3 | toutes | Le compteur du bouton Amis ne baisse pas après une réponse depuis une notification | `apps/web/components/friends-panel.tsx:263` | à corriger |
| E.4 | P3 | 375 | Questions de leçon : la ligne sous chaque question coupe « Signaler » | `apps/web/app/(app)/lessons/[slug]/_components/lesson-qa.tsx:233` | à corriger |
| E.5 | P3 | toutes | Solutions d'un défi : le nom d'un auteur au profil privé mène à une 404 | `apps/web/app/(app)/challenges/[slug]/_components/writeups-section.tsx:91` | à corriger |
| E.6 | P3 | toutes | Forum : l'auteur voit « retiré » sur un message en attente de validation ou masqué par la modération | `apps/web/app/(app)/forum/_components/post-card.tsx:116` | à corriger |
| E.7 | P3 | toutes | Dernière étape de la suppression : la page annonce que les certificats seront effacés, alors qu'ils restent vérifiables | `apps/web/app/account/delete/confirm/page.tsx:80` | à corriger |
| E.8 | P3 | toutes | « Mes demandes » : « N réponses » compte aussi les messages de l'apprenant | `packages/db/src/repositories/ticket.repository.ts:239` | à corriger |
| E.9 | P3 | 375, 768 | « Ajouter » sur une ligne du classement : bouton d'environ 17 px posé sur un lien qui couvre la carte | `apps/web/app/globals.css:6199` | à corriger |

Relevés aussi dans ce parcours : les messages de limite au vouvoiement sur les
solutions, les questions de leçon et les demandes d'aide (A.4).

**E.1.** Les deux panneaux sont ancrés au bord droit de leur bouton, avec une
largeur fixe de 340 et 360 px. Sur téléphone, ils commencent à -117 et -91 px.
Sont alors hors de l'écran, sans défilement possible :

- les avatars, le début des noms et les titres ;
- le champ « Ouvrir un profil » ;
- le début de chaque notification.

Le panneau Amis est la seule page « Amis » du site. C'est aussi le constat
BR5 du rejeu.

**Correctif :** sous 560 px, `position: fixed; top: 56px; left: 8px;
right: 8px; width: auto` pour les deux panneaux (56 px, la hauteur de la
barre, `NAVBAR_HEIGHT` de `lib/chrome.ts`). La largeur du
panneau des notifications doit quitter le style en ligne pour une classe,
sinon la règle ne s'applique pas.

**E.2.** Le cas : une personne bannie a coupé « Avis par email », et son appel
est refusé (une réponse, puis le ticket résolu). Elle ne reçoit jamais la
décision :

- `emailReply` ne part pas ;
- aucune notification `TICKET_UPDATE` n'est jamais créée ;
- /support lui est fermé, ainsi que ses réglages.

/banned et l'app répètent « La réponse arrivera par e-mail », un texte qui ne
dépend que de l'existence d'un appel, et refusent un second appel. Pour un
bannissement définitif, l'impasse est permanente.

**Correctif :**

- toujours envoyer l'e-mail d'une réponse de l'équipe sur un ticket, au
  moins pour `BAN_APPEAL` ;
- sur /banned et l'écran mobile, lire le ticket d'appel
  (`ticketRepository.findForRequester`) et afficher son statut et la dernière
  réponse ;
- créer une notification `TICKET_UPDATE` à chaque réponse.

**E.3.** Après « Accepter » ou « Refuser » depuis la cloche ou /notifications
(#523), la pastille « 1 » reste sur Amis. Si le panneau a déjà été ouvert, la
demande y reste aussi, et « Accepter » répond « Cette demande n'est plus en
attente. ». Pire : « Refuser » sur cette ligne périmée retire, sans
confirmation, l'amitié qu'on vient d'accepter.

**Correctif :** resynchroniser l'état quand la prop change : `key={friendRequestCount}`
sur `<FriendsPanel>` dans `navbar.tsx`, ou un effet qui remet le compte et
`loaded` à zéro.

**E.4.** La ligne sous chaque question (auteur, date, nombre de réponses,
« Signaler ») ne passe pas à la ligne. Le nom, la date et le compteur se
replient mot par mot. Le bouton est rogné par le bord de la carte dès que le
pseudo dépasse 7 ou 8 caractères, dès 6 à 360 px. La ligne des réponses, elle,
passe à la ligne.

**Correctif :** `flexWrap: "wrap"` et un `rowGap`, en gardant
`marginLeft: "auto"` sur le bouton.

**E.5.** Un apprenant qui a résolu un défi lit les solutions des autres. Le nom
d'un auteur qui n'est pas son ami et qui a fermé son profil ouvre « Cette page
est introuvable ». Toutes les autres listes de noms (forum, duels, classe,
amis, classement) suivent la règle de `profilesOpenTo` : un lien qui mène à
une 404 est pire qu'un nom sans lien. L'app n'a pas de lien, il n'y a rien à y
faire.

**Correctif :** dans `writeupBoardFor`, appeler
`userRepository.profilesOpenTo(userId, ids)` et ne garder le pseudo que pour
les profils ouverts au lecteur, comme `facesFor`. Ajouter un cas au test.

**E.6.** Après une réponse retenue par le filtre, l'avis jaune dit « pas encore
publié… le temps qu'un modérateur le relise ». Au même moment, le message
s'affiche marqué « retiré », en rouge. D'autres cas trompent aussi :

- un message masqué par l'équipe se lit comme retiré par son auteur ;
- un sujet retenu dès sa création n'a même pas l'avis.

L'app fait la même confusion (« Retiré : toi seul le vois »). Les solutions,
elles, font la différence depuis #517.

**Correctif :** exposer l'état dans `ForumPostView`, et afficher « en attente
de validation », « masqué par la modération » ou « retiré », sur le site et
dans l'app. `hiddenByModeration` ne suffit pas à distinguer un message retenu
d'un retrait par l'auteur : l'état « en attente » se lit dans
`moderation_events`, ou dans un état explicite.

**E.7.** Juste avant le geste irréversible, la page dit « … tes notes et tes
certificats seront effacés ». Tous les autres textes disent au contraire que
les certificats restent vérifiables sous « Utilisateur supprimé » :

- les réglages ;
- le mail de confirmation ;
- la page de succès ;
- la politique de confidentialité.

Seul le PDF est effacé.

**Correctif :** « … tes notes seront effacés. Tes certificats restent
vérifiables publiquement, mais ne portent plus ton nom. »

**E.8.** Un apprenant qui ajoute une précision à sa demande voit « · 1
réponse » dans sa liste, sur le site comme dans l'app. Il croit que l'équipe a
répondu.

**Correctif :** `_count: { select: { messages: { where: { fromStaff: true } } } }`.
Le site et l'app suivent.

**E.9.** Un toucher à côté de la puce ouvre le profil au lieu d'envoyer la
demande : le lien de la carte s'étend sur toute sa surface. La puce est sous
le minimum WCAG AA de 24 px, sans l'exception d'espacement puisque le lien est
dessous. La même puce, moins gênante, se trouve dans la liste de classe.

**Correctif :** `min-height: 44px` (ou 32 px et un pseudo-élément qui agrandit
la zone) avec une marge verticale, au moins sous `@media (pointer: coarse)`.

### F. Application mobile

Relu : rappel du jour et « Réviser ce module », retrait de la file SM-2, amis,
duels, signalements, notifications et liens, hub du profil, profil public,
certificats révoqués, classement, tournois, registre de parité ligne par ligne
(les 75 routes de `api/mobile` comprises), règles du dépôt.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| F.1 | P2 | 375 (360 à 393) | Classement public : « Ajouter » écrase le nom de chaque joueur non ami | `apps/mobile/app/leaderboard.tsx:573` | à corriger |
| F.2 | P3 | toutes | Un lien d'annonce vers un écran que l'app possède ne s'ouvre pas | `apps/mobile/lib/notification-links.ts:101` | à corriger |
| F.3 | P3 | téléphone | « Réviser ce module », « Fiche de révision », « Lire hors ligne » et « Ton rappel du jour t'attend » : cibles sous 36 px | `apps/mobile/app/paths/[slug].tsx:214` | à corriger |
| F.4 | P3 | toutes | Boîte de réception : « N non lues » et « Tout marquer lu » ne comptent que les pages chargées | `apps/mobile/app/notifications.tsx:118` | à corriger |
| F.5 | P3 | toutes | Carte « Rappel du jour » de l'Accueil : l'état de la veille reste affiché tant que l'app reste en mémoire | `apps/mobile/app/(tabs)/home.tsx:62` | à corriger |
| F.6 | P3 | toutes | Règle 2 : 59 casts `as` sur les réponses JSON, et aucun lint sur l'app | `apps/mobile/lib/api.ts:785` | à corriger |

**F.1.** La puce « Ajouter » (#523) s'affiche sur la ligne nommée d'un joueur
public qui n'est pas un ami. Avec le rang, l'avatar, « NV.12 » et l'XP, elle
ne laisse au nom qu'environ 7 px à 375 (22 à 390, rien à 360) : le nom se
réduit à « … ». L'apprenant ne sait plus qui occupe la place, ni à qui il
envoie la demande.

Les lignes anonymes, le réglage par défaut, n'ont pas de puce. La liste d'amis
connaît le même tassement, moindre : environ 45 px au nom avec « Duel en
cours » et « Retirer ».

**Correctif :** au choix :

- retirer `width: 84` de l'XP et masquer « NV. » quand la puce est là ;
- passer la puce sous le nom ;
- en faire une icône « + » de 44 px avec son libellé d'accessibilité.

**F.2.** La console accepte comme lien d'annonce n'importe quel chemin du
site, et propose elle-même « /paths » en exemple. Pour les adresses suivantes,
l'app ne trouve pas d'écran :

- /paths et /leaderboard ;
- /forum et /forum/<section> ;
- /challenges/<slug> ;
- /support, /glossaire et /locker.

L'app a pourtant tous ces écrans. Dans la boîte de réception, toucher
l'annonce la marque seulement lue. Dans la barre du téléphone, elle ouvre la
boîte de réception. Le registre ne justifie ce comportement que pour un écran
que l'app n'a pas.

**Correctif :** ajouter ces adresses à `inAppRouteFor` (/glossaire vers
/glossary), chacune avec un cas dans `notification-links.test.ts`. Laisser
de côté /changelog, page retirée, et /dashboard sans rappel, choix fixé par
un test.

**F.3.** Dans l'en-tête de chaque module, trois liens d'environ 13 px de haut
sont empilés à 4 à 6 px l'un de l'autre :

- « Fiche de révision » ;
- « Réviser ce module · 2 min », ajouté par #511 ;
- « Lire hors ligne » (`offline-toggle.tsx:64-81`).

Un doigt mal placé ouvre la mauvaise fiche ou lance un téléchargement. Le
lien du rappel sur l'Accueil (`home.tsx:249`) fait environ 20 px. La règle de
l'app (`components/buttons.tsx`) demande au moins 36 px et un cadre ; les
puces de période du classement, à 36 px, la respectent.

**Correctif :** passer ces liens par `ActionChip`, qui donne la taille et le
cadre, ou leur donner `minHeight: 44` et `justifyContent: "center"`.

**F.4.** Deux situations faussent le compte :

- avec plus de 50 non lues, l'en-tête plafonne à « 50 non lues », quand la
  cloche de l'Accueil en annonce plus ;
- si les 50 dernières sont lues mais qu'il en reste d'anciennes, la cloche
  affiche un nombre, alors que la boîte n'a ni compteur ni « Tout marquer
  lu ». La pastille ne s'éteint qu'après plusieurs « Charger plus ».

Le site lit le compte du serveur. Le registre (`docs/MOBILE_PARITY.md:194`)
suppose ce nombre juste.

**Correctif :** lire `useUnreadCount(userId)` pour l'en-tête et pour la
condition de « Tout marquer lu ». Garder le filtre local pour le point de
chaque carte.

**F.5.** L'apprenant a fait son rappel hier et rouvre l'app ce matin, sans
l'avoir fermée : la carte dit « Fait pour aujourd'hui », et « Ton rappel du
jour t'attend » n'apparaît pas. Il faut tirer l'écran vers le bas. Les quêtes
et la série de l'Accueil ont le même retard. Deux causes :

- rien ne relit les données au retour au premier plan : aucun `focusManager`
  n'est branché sur `AppState` ;
- la clé de la requête ne contient pas le jour.

**Correctif :** brancher `focusManager` sur `AppState` dans `app/_layout.tsx`
et relire `["rappel"]` au retour au premier plan, ou mettre le jour dans
`dailyRecallKey`.

**F.6.** Rien de visible tant que le serveur répond la forme attendue. Une
réponse d'une autre version passerait pour valide et pourrait casser l'écran
qui la lit, par exemple « Tes amis » sans `items`. Sur 59 lectures
`(await res.json()) as …`, 4 portent un commentaire de justification.

`apps/mobile` n'a pas de script `lint`. C'est ce qui a laissé en place la
constante morte `TYPE_META` (`app/notifications.tsx:30-40`, reste de F60).

**Correctif :** lire les réponses par des schémas Zod en `safeParse`, comme
`lib/rappel.ts`, en commençant par `friends/activity`. À défaut, un
commentaire de justification par cast. Ajouter un script `lint` à
`apps/mobile` : il ne vérifie pas les commentaires des casts, mais il attrape
le code mort.

### G. Console, situation par situation

Situations rejouées :

- un ticket sur un bannissement ;
- un message du forum signalé ;
- une correction d'XP et de badge depuis la fiche 360 ;
- un export RGPD ;
- une annonce à une classe ;
- une leçon éditée au studio puis publiée ;
- un import par-dessus une leçon existante et une synchro ;
- un certificat révoqué ;
- un flag de tournoi disqualifié.

Relu aussi : les référentiels, les tâches planifiées, « Mon compte », le
journal d'audit, la recherche ⌘K, la coque aux quatre largeurs et la garde
d'accès.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| G.1 | P2 | 1280 (pire de 1024 à 1279, et sous 1024) | Import par-dessus une leçon existante : la colonne des différences ne fait que 260 px | `apps/admin/app/globals.css:213` | à corriger |
| G.2 | P3 | toutes | Le même bannissement s'affiche à deux heures : UTC sur le ticket, heure de Paris sur la fiche | `apps/admin/app/(admin)/tickets/[id]/page.tsx:104` | à corriger |
| G.3 | P3 | toutes | « Un appel est ouvert » reste affiché quand le ticket d'appel est résolu ou clos | `apps/admin/app/(admin)/users/[id]/_components/ban-form.tsx:97` | à corriger |
| G.4 | P3 | toutes | La fiche 360 ignore les signalements et les gestes de modération des contenus publiés | `apps/admin/app/(admin)/users/[id]/_components/moderation-panel.tsx:46` | à corriger |
| G.5 | P3 | toutes | Le studio publie sans prévenir que des quiz déjà répondus changent | `apps/admin/app/(admin)/lessons/[id]/actions.ts:117` | à corriger |
| G.6 | P3 | 375 | La recherche rapide (comptes, leçons, tickets) disparaît sous 768 px | `apps/admin/app/admin-ui.css:107` | à corriger |
| G.7 | P3 | toutes | Tâches planifiées : planning en UTC et passages à l'heure de Paris sur la même ligne | `apps/admin/app/(admin)/system/crons/page.tsx:130` | à corriger |
| G.8 | P3 | toutes | Règle 8 : le studio lit encore la base par Prisma | `apps/admin/app/(admin)/lessons/[id]/(studio)/page.tsx:51` | en partie corrigé par #532, reste à corriger |

**G.1.** L'administrateur doit relire le diff avant « Confirmer la mise à
jour » (#528). À 1280 px, la colonne du milieu est prise entre la liste
(320 px) et l'aperçu (340 px) :

- le diff n'affiche qu'environ 25 caractères par ligne ;
- la liste des champs modifiés n'a que 104 px ;
- le bouton de confirmation (environ 219 px, sans retour à la ligne) déborde
  et ajoute une barre de défilement horizontale au panneau.

C'est pire ailleurs :

- de 1024 à 1200 px, l'éditeur ne fait que quelques dizaines de pixels ;
- sous 1024 px, l'éditeur MDX ne montre que deux lignes.

**Correctif :**

- trois colonnes seulement à partir de 1440 px ;
- entre 1024 et 1439 px, deux colonnes (`minmax(0, 300px) minmax(0, 1fr)`),
  avec l'aperçu sous le panneau du milieu ;
- sous 1024 px, `flex: 1` au panneau et `min-height: 60vh` à la zone de
  texte ;
- laisser les boutons de `.import-update` revenir à la ligne.

Passer la page en `data-width="full"` ne suffit pas à 1280 px.

**G.2.** Le ticket d'appel affiche « Décidé le 18 octobre à 08:12 », la fiche
« 18/10/2026 10:12 » pour le même bannissement. Le même écart sépare une
réponse du fil de sa ligne au journal d'audit, et rien n'indique l'UTC. En
local à Paris, l'écart ne se voit pas : seul le serveur de production tourne
en UTC.

**Correctif :** `timeZone: "Europe/Paris"` sur les formateurs de dates de :

- `tickets/[id]/page.tsx` et `tickets/(list)/page.tsx:31` ;
- `users/[id]/page.tsx:49-51` et `users/_components/dates.ts` ;
- `moderation/(list)/page.tsx:53`.

Le mieux est un formateur unique pour toute la console.

**G.3.** Un appel est refusé et son ticket clos. La fiche affiche pourtant
toujours, en orange, « Un appel est ouvert · lire » sur le bannissement en
cours : un collègue croit qu'une demande attend.

**Correctif :** lire le statut du ticket avec le bannissement
(`appealTicket: { select: { id, status } }`), puis afficher « Appel en
cours » ou « Appel traité » selon `isTicketOpen`.

**G.4.** Un exemple : un administrateur supprime trois messages signalés d'un
auteur depuis /moderation/reports. La fiche de l'auteur affiche ensuite
« Contenus signalés par le filtre · 0 », et aucune ligne d'audit. En effet :

- ces gestes sont journalisés sur le contenu, l'auteur n'étant rangé que dans
  les métadonnées ;
- la fiche ne lit ni les signalements ni ces lignes du journal.

L'historique sur lequel décider d'un bannissement est donc invisible.

**Correctif :** deux listes sur la carte :

- les signalements reçus par les contenus de l'auteur
  (`contentReportRepository`) ;
- les gestes sur ses contenus, par un filtre d'audit sur `metadata.authorId`.

/moderation/content n'a pas de filtre par auteur : il faut l'ajouter pour
pouvoir y renvoyer.

**G.5.** Un auteur corrige au studio la bonne réponse d'un quiz déjà répondu
par des centaines d'apprenants, puis clique « Publier les changements ».
Aucun avertissement ne s'affiche, alors que la même modification par l'import
ou la synchro affiche « Quiz modifiés qui ont déjà des réponses… ». Renommer
l'identifiant d'un quiz l'écarte aussi de toutes ses réponses enregistrées,
sans un mot. Ce n'est pas une régression : l'ancien éditeur ne prévenait pas
non plus.

**Correctif :** dans `publishLessonChangesAction` :

1. comparer les quiz du brouillon à ceux de la version publiée
   (`extractLessonQuizzes`) ;
2. lire `quizAnswerCounts` ;
3. sans `force`, renvoyer l'impact, que l'alerte du studio montre avec
   « Publier quand même », comme le conflit `lesson`.

**G.6.** Sur téléphone, la barre du haut n'a ni champ de recherche ni loupe :
la recherche transverse de #512 n'existe plus. Les listes Comptes, Leçons et
Tickets gardent chacune leur recherche, au prix de deux touchers de plus par
le menu.

**Correctif :** sous 768 px, un bouton loupe de 44 × 44 px qui ouvre
QuickSearch en plein écran.

**G.7.** Sur la ligne de `retention`, on lit « Tous les jours à 03:30 UTC »
puis « Prochain passage : 23 oct., 05:30 ». L'écart passe de 2 h à 1 h au
changement d'heure.

**Correctif :** « heure de Paris » dans les en-têtes Dernier passage et
Prochain passage, ou le planning converti à l'heure de Paris.

**G.8.** Rien de visible. Relevé sur `9c1cab8b`, deux contournements des
repositories :

- le contrôle du refCode et du slug à la publication (`actions.ts`) ;
- les écritures des parcours et des prérequis (`lesson-links-actions.ts`),
  avec un journal écrit par `tx.auditLog.create` et des noms d'action en
  littéraux.

#532, fusionnée après la passe, les fait passer par `lessonRepository`
(`findTaken`, `changePaths`, `changePrerequisites`) et
`auditLogRepository.record`, comme le reste des actions des leçons, de
l'import et des signalements. Il reste :

- les cinq lectures de la page du studio (l.51, 101, 107, 115 et 126),
  reprises de l'ancien éditeur ;
- côté site, six écritures du journal par Prisma :
  - `my-class/_actions/class-lesson-actions.ts:106` et `153` ;
  - `class-path-actions.ts:96` et `164` ;
  - `api/me/export/route.ts:58` ;
  - `lib/rgpd/request-deletion.ts:78`.

**Correctif :** les lectures du studio dans `lessonRepository` et
`pathRepository`, et le journal du site par `auditLogRepository.record` avec
`AUDIT_ACTION`.

### R. Quatre largeurs (site et console)

Relu à 375, 768, 1280 et 1440 px :

- côté site : coque, barre du haut et ses panneaux, fenêtres et tiroirs,
  rappel du jour, tableau de bord, page de leçon et ateliers, « Défier »,
  examen blanc, classement, forum, notifications, réglages, profil public ;
- côté console : coque, listes, fiche utilisateur, studio, import et synchro.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| R.1 | P2 | 1440 et plus | Notes ancrées : les panneaux Amis et Notifications s'ouvrent sous elles | `packages/ui/src/dialogs.css:166` | à corriger |
| R.2 | P2 | 375, 768 | Le tiroir de navigation reste ouvert après le choix d'une page | `apps/web/components/sidebar-nav.tsx:308` | à corriger |
| R.3 | P2 | toutes | Fenêtre « Rappel du jour » : question et réponses collées aux bords | `apps/web/components/rappel/rappel.css:4` | à corriger |
| R.4 | P2 | 375 (360 à 385), du 1er décembre au 7 janvier | La barre du haut déborde pendant la période Wrapped, la page défile en largeur | `apps/web/components/navbar.tsx:84` | à corriger |
| R.5 | P3 | 375, 768 | Tiroir mobile réduit aux icônes, sans libellés, après un repli sur grand écran | `apps/web/components/sidebar-wrapper.tsx:26` | à corriger |
| R.6 | P3 | 375, 768 | Au chargement, une bande vide de 240 px écrase la page | `apps/web/components/app-shell.tsx:74` | à corriger |
| R.7 | P3 | toutes | Panneau Amis : un ami en duel n'a plus que 4 ou 5 lettres de son nom visibles | `apps/web/components/friends-panel.tsx:128` | à corriger |
| R.8 | P3 | 375 | Le fil d'Ariane ne revient pas à la ligne : l'examen blanc coupe « examen blanc » | `apps/web/app/globals.css:4529` | à corriger |
| R.9 | P3 | 375, 768 | Studio de leçon sous 1100 px : aperçu forcé à côté de l'éditeur, barre collante de 4 à 5 lignes | `packages/ui/src/components/mdx-editor-panel.tsx:1063` | à corriger |
| R.10 | P3 | 375 (Safari iOS) | Le tiroir mobile fait 100vh : le bloc compte et « Déconnexion » passent sous la barre du navigateur | `apps/web/app/globals.css:224` | à corriger |

Relevés aussi à ces largeurs : E.1, G.1, D.3 et D.4.

**R.1.** Une leçon est ouverte avec ses notes ancrées. La cloche ou Amis
ouvrent un panneau dont 236 à 282 px passent sous les notes, et tout le
panneau avec les notes larges. « Accepter », « Tout marquer comme lu » et les
liens sont cachés, et un clic tombe dans les notes. Cause : le tiroir ancré
est à `z-index: 46`, au-dessus de la barre du haut (40), dont les panneaux
restent enfermés dans le contexte d'empilement.

**Correctif :** `.side-drawer--docked { z-index: 39 }` (le tiroir commence de
toute façon sous la barre), et corriger le commentaire de `dialogs.css`.

**R.2.** Choisir « Classement » ou « Forum » change la page derrière le tiroir
de 280 px et son voile. Il faut toucher le voile pour voir la page, à chaque
navigation. Seule l'entrée « Révisions » ferme le tiroir.

**Correctif :** dans SidebarWrapper,
`useEffect(() => { setOpenMobile(false); }, [pathname, setOpenMobile])`.

**R.3.** Dans le rappel du jour et dans « Réviser ce module », les pastilles,
la question, les réponses, le verdict et le bilan touchent les bords du cadre.
Les cases de réponse font un double trait avec la bordure, alors que l'en-tête
et les boutons sont en retrait de 20 px. Le contour de focus des réponses est
rogné.

**Correctif :** `.rp { padding: 18px 20px 20px; }`, et `16px` sous 560 px.

**R.4.** Pendant la période Wrapped, la puce « Wrapped » (environ 93 px) fait
dépasser la barre du haut. Chaque page de l'app défile en largeur :

- d'environ 10 px à 375 ;
- de 25 px à 360 ;
- pas du tout à partir de 390.

L'avatar est coupé à droite.

**Correctif :** sous 420 px, ne garder que l'icône de la puce
(`.wr-chip__label { display: none }`), comme pour Nouveautés.

**R.5.** Le cas : la barre latérale a été repliée sur un ordinateur, par
« Mode focus » ou à la main. Ensuite, une fenêtre réduite sous 1024 px, ou un
iPad passé en portrait, ouvre un tiroir de 280 px qui n'a qu'une colonne
d'icônes :

- ni nom de page ni titre de groupe ;
- pas d'infobulle ;
- pas de nom accessible pour un lecteur d'écran.

Rien ne permet de le déplier sous 1024 px.

**Correctif :** `data-state={isMobile ? "expanded" : state}` dans
SidebarWrapper, ou une règle CSS dans la media query 1023 px, qui évite un
écart d'hydratation.

**R.6.** Le repli de la barre latérale, pendant son chargement, est une
colonne de 240 px dans le flux, à toutes les largeurs. Sur téléphone, à chaque
chargement complet, la page ou son squelette s'affiche dans 135 px, puis saute
en pleine largeur quand la barre arrive. Le rejeu a mesuré une fenêtre de mise
en page élargie à 522 px sur /paths/linux (BR2).

**Correctif :** masquer ce repli sous 1024 px (`hidden lg:block`).

**R.7.** Pendant un duel, « Duel en cours » (124 px) et « Retirer » (80 px)
ne laissent que 44 px au nom : « Alexa… », « Jorda… », et 29 px avec une
barre de défilement Windows. Aucune infobulle ne donne le nom entier.

**Correctif :** laisser les actions passer sous l'identité (`flex-wrap: wrap`,
actions en `flex-basis: 100%`) quand il y a deux boutons, ou un libellé
court. Le plan veut le bouton grisé, pas masqué.

**R.8.** « $ ~/ cyberlearn / parcours / fondamentaux-informatique / examen
blanc » mesure environ 413 px pour 343 disponibles. Le slug et la fin se
cassent, et « examen blanc » ainsi que le curseur sont coupés au bord, à
l'ouverture comme sur l'écran de résultat. Tout slug dont le plus long morceau
dépasse quatre caractères déborde.

**Correctif :** `flex-wrap: wrap; row-gap: 4px; max-width: 100%` sur
`.pg-crumb` et `overflow-wrap: anywhere` sur `.pg-crumb__leaf`, puis retirer
les deux variantes locales, celle de la leçon et celle des tournois.

**R.9.** Sur téléphone, Monaco a environ 188 px et l'aperçu 146 ; à 768,
258 et 205. La barre collante (état, version, raccourci, deux boutons) fait
140 à 180 px sous la barre du haut. Le même panneau sert à l'éditeur des
professeurs.

**Correctif :**

- démarrer sans partage quand le panneau est étroit (`ResizeObserver`, sous
  700 px), ou empiler l'aperçu sous l'éditeur ;
- sous 1100 px, une barre non collante, et le raccourci clavier masqué sur
  écran tactile.

**R.10.** Quand la barre de Safari est affichée (en haut de page), l'avatar,
le nom et le seul bouton « Déconnexion » de l'app sont cachés ou difficiles à
toucher. C'est déduit du code et du comportement connu de Safari, et ne se
reproduit pas dans Chromium.

**Correctif :** `height: 100vh; height: 100dvh;` sur `.sidebar-wrapper` dans
la media query mobile.

### T. Angles morts

Recherchés en comparant les routes du site, de la console et de l'app aux
étapes tracées, et les 694 fichiers modifiés de #499 à #531 aux parcours. Les
zones suivantes, que personne n'avait tracées, ont été relues :

- le profil de l'apprenant ;
- l'export RGPD comparé au schéma ;
- les fenêtres ouvertes par l'adresse ;
- les titres d'onglet ;
- les défis, duels et tournois côté site ;
- l'éditeur des professeurs ;
- la console hors des situations de G ;
- les migrations récentes ;
- les liens vers les routes redirigées ;
- les crons ;
- le journal des nouveautés 3.6.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| T.1 | P2 | toutes | /profile : « Leçons terminées » plafonne à 20 | `apps/web/app/(app)/profile/page.tsx:203` | à corriger |
| T.2 | P2 | toutes | Export RGPD : forum, amis, classes, exercices et sanctions manquent, alors que la page promet « l'ensemble de tes données » | `packages/db/src/rgpd/build-export.ts:406` | à corriger |
| T.3 | P3 | toutes | Navigateur neuf : la vidéo de bienvenue s'ouvre par-dessus la fenêtre que l'adresse demande | `apps/web/app/(app)/dashboard/_components/welcome-modal.tsx:27` | à corriger |
| T.4 | P3 | toutes | Onglets : le tableau de bord porte le titre marketing du site, toutes les leçons s'appellent « Leçon » | `apps/web/app/(app)/lessons/[slug]/page.tsx:34` | à corriger |
| T.5 | P3 | toutes | Duel, défi reçu, flag de tournoi et quelques formulaires : une action serveur qui échoue remplace la page par l'écran d'erreur | `apps/web/app/(app)/duels/[id]/_components/duel-play.tsx:310` | à corriger |

**T.1.** Un apprenant qui a fini 35 leçons lit « 20 » dans la tuile et sur
l'onglet Activité de son propre profil. Il lit 35 sur /u/<lui> et dans l'app.
Le chiffre ne monte plus. Cause : `findProfile` lit les 20 dernières lignes
(`take: 20`), et la page compte la liste. #505 avait corrigé ce plafond sur
le profil public.

**Correctif :** un `_count` filtré sur `COMPLETED` dans `findProfile` pour la
tuile, et `take: 20` pour la seule liste.

**T.2.** Le fichier exporté, depuis le site comme depuis la console (#531),
ne contient pas :

- les sujets et messages du forum, que la suppression du compte anonymise
  sans les effacer ;
- les amitiés et les classes ;
- les exercices réussis ;
- les bannissements et les décisions du filtre.

La page affiche aussi « Portée 17 modèles », un chiffre écrit en dur. Le droit
d'accès et à la portabilité est donc incomplet.

**Correctif :** une lecture par repository dans `buildExportPayload` : forum,
amitiés, classes, exercices, bannissements, événements de modération. Retirer
« 17 modèles » ou le calculer depuis les clés de l'export. Étendre
`build-export.test.ts`.

**T.3.** Plusieurs liens ouvrent une fenêtre ou un tiroir par l'adresse :

- le rappel quotidien (`/dashboard?rappel=1`) ;
- un pied d'e-mail (`/settings/notifications`) ;
- `/settings/data`.

Ouverts sur un nouvel appareil, ils empilent « Bienvenue sur CyberLearn » et
la fenêtre demandée. En fermant l'une, on tombe sur l'autre, et le focus
clavier part sur la page. Cela n'arrive qu'une fois par navigateur. C'est le
constat BR1 du rejeu, ramené de P2 à P3 par les relecteurs.

**Correctif :** ne pas ouvrir la bienvenue quand l'adresse porte une clé de
`QUERY_DIALOGS` (`useSearchParams`), ou la différer. Un test : /dashboard?rappel=1
avec un `localStorage` vide ne montre qu'une fenêtre.

**T.4.** Avec plusieurs leçons ouvertes, les onglets, l'historique et les
favoris affichent tous « Leçon · CyberLearn ». Le tableau de bord s'appelle
« CyberLearn · Apprendre la cybersécurité en pratique », comme l'accueil
public (`dashboard/page.tsx` n'a pas de métadonnées). C'est le constat BR3.

**Correctif :** `metadata = { title: "Tableau de bord" }`. Pour la leçon, un
`generateMetadata` qui lit le titre par la recherche limitée au lecteur
(`lessonsVisibleTo`), « Leçon » à défaut, comme `visiblePathTitle` pour un
parcours.

**T.5.** Le cas : une coupure réseau ou une erreur serveur au moment de
répondre à une question de duel, d'accepter un défi ou d'envoyer un flag.
L'écran disparaît au profit de « Cette section n'a pas pu se charger », et on
ne sait plus si la réponse est partie.

F46 avait corrigé ce motif dans les panneaux Amis et Notifications seulement.
Il reste dans :

- `duel-play.tsx:310`, `respond-buttons.tsx:27` et
  `tournament-flag-form.tsx:33` ;
- `lesson-rating.tsx:69` et `qa-forms.tsx` ;
- `ProfileForm`, `PrivacyForm` et `NotificationsForm`.

**Correctif :** un try/catch qui affiche le message dans l'écran (« Réponse
non envoyée, réessaie »), comme `friends-panel.tsx`, puis relire la vue du
duel.

### Relevés du rejeu navigateur, hors contre-expertise

Observés à l'écran le 22 octobre, ils n'ont pas été soumis aux trois
relecteurs. Ils entrent dans la même PR de correction.

| ID | Gravité | Largeur | Constat | Fichier:ligne | Correctif | Statut |
|---|---|---|---|---|---|---|
| BR6 | P3 | 375 | Réglages ouverts par l'adresse sur une section éloignée (`?settings=account`) : la bande des sections reste au début, l'onglet actif est hors de l'écran | `apps/web/app/(app)/_settings/_components/SettingsDrawer.tsx:343` | `scrollIntoView({ inline: "nearest" })` de l'onglet actif à l'ouverture et à chaque changement de section | à corriger |
| BR7 | P3 | 375 | Console, fiche utilisateur : la page s'élargit à 391 px, car « Supprimer ce compte et toutes ses données » ne revient pas à la ligne (`.a-btn { white-space: nowrap }`, `admin-ui.css:479`) | `apps/admin/app/(admin)/users/[id]/_components/delete-user-form.tsx:86` | `white-space: normal` sur ce bouton (ou `.a-form .a-btn`), ou un libellé plus court | à corriger |
| BR8 | P3 | toutes | Console : la barre latérale annonce « Leçons 162 » (les publiées) quand la liste dit « Leçons (349) » ; ces compteurs sont lus par Prisma (règle 8) | `apps/admin/app/(admin)/layout.tsx:20` | Préciser « publiées » ou compter comme la liste ; compteurs par les repositories | à corriger |
| BR9 | P3 | toutes | Console : /classes/new s'intitule « Créer · Admin » | `apps/admin/app/(admin)/classes/new/page.tsx:10` | « Nouvelle classe » | à corriger |

À 375 px, le rejeu n'a vu ni débordement en largeur ni erreur sur les pages
suivantes :

- /, /catalogue, /glossaire, /contact, /download ;
- /u/eleve et /u/inconnu, qui répond bien 404 ;
- /login et /dashboard ;
- /paths, /paths/linux et une leçon ;
- /leaderboard, /forum, /notifications ;
- /profile, /notes, /locker ;
- /challenges, /duels, /support, /wrapped ;
- /revisions, qui redirige bien vers /dashboard?rappel=1.

Les tiroirs Plan et Notes de la leçon et la fenêtre des nouveautés passent en
plein écran, avec le focus dedans, et Échap les ferme. À 1280 px, les
40 pages statiques de la console répondent avec leur titre.

## Laissé de côté, par décision ou par blocage

| Sujet | État |
|---|---|
| Idée 6 du backlog d'apprentissage interactif, deux machines reliées | Le propriétaire a retenu une version cadrée : un audit de durcissement (#460). Le labo à deux machines (#487) n'existe que sur le site ; l'app affiche une carte qui renvoie au site (`docs/MOBILE_PARITY.md`). La version plus complète de l'idée d'origine n'est pas faite. |
| Idées 13 et 15 (mots de passe, JWT) en version complète | Faites en version cadrée (#461 `<PasswordLab>`, #462 `<JwtLab>`), sur des données d'exemple. Les versions plus complètes ne sont pas faites. |
| Rattacher ces leçons à un parcours | Non fait : blue team 13 (`CL-LSN-17091`), crypto 13 mots de passe (`CL-LSN-14081`) et crypto 13 JWT (`CL-LSN-14082`) sont importables mais hors de tout parcours. À faire depuis la console, où leurs refCodes pourront être renumérotés. |
| Refus côté serveur d'un administrateur qui retire son propre second facteur | Non posé. Le site et l'app masquent le bouton pour un ADMIN, mais Supabase Auth laisse toute session aal2 retirer ses facteurs. Les raisons et la piste (déclencheur sur `auth.mfa_factors`) sont dans `docs/hardening/known-issues.md`. |
| Refuser la fin d'une leçon dont les quiz n'ont pas de réponse | Non fait. La page n'offre « Terminer » qu'à la dernière section ; le serveur, lui, enregistre la fin de leçon et fige le score des quiz sans exiger de réponse. |
| Un type de quête propre au rappel du jour | Non créé. Le rappel compte pour la série et sa quête hebdomadaire. |

## Mise en production : ce qui reste à faire

La migration `20261018120000_retire_review_schedules` (#527) a retiré
l'ancienne file SM-2 du site et de l'app. Ses lignes attendent leur conversion
dans `review_schedules_legacy`, fermée à tout client. Il faut lancer la
conversion en production, d'abord à blanc :

```sh
pnpm --filter @cyberlearn/db db:backfill-review-cards            # essai : les comptes, rien n'est écrit
pnpm --filter @cyberlearn/db db:backfill-review-cards --apply    # écrit les cartes
```

La conversion est idempotente : une seconde passe n'écrit rien. La table
`review_schedules_legacy` sera supprimée dans une version ultérieure, une fois
la conversion faite en production. Il faut donc lancer `--apply` avant de
déployer cette version, sinon les lignes non converties partent avec la table.
La lecture de l'export RGPD qui la concerne part avec elle. La vue
`review_schedules`, gardée pour les apps déjà installées, ne dépend pas de
cette table. Le détail est dans `docs/DEPLOY.md`.

## Conclusion

Pour les **apprenants** :

- Les leçons s'affichent de nouveau en entier : les 240 schémas Mermaid sont
  revenus. Les leçons tiennent dans une colonne centrée, avec une barre
  d'outils, un plan et des notes en tiroirs, et des ateliers à la taille de
  leur bloc.
- Les révisions se font en un rappel de six questions par jour, corrigé par
  le serveur, et « Réviser ce module » prend deux minutes. L'ancienne file
  SM-2 est convertie puis retirée.
- Le volet social a été complété : amis (« Défier », @pseudo, « Tes amis »,
  réponse depuis l'avis), classement de la semaine et du mois, profil public
  complet aux chiffres exacts.
- Les fenêtres remplacent les détours de page, et la barre latérale tient en
  cinq groupes.
- Le certificat porte un seul numéro vérifiable, et le nom figé à l'émission.
- La double authentification se valide au sixième chiffre.
- Les premiers pas sont réparés : limites de connexion par action, saisie
  gardée, retour arrière, dispenses du test respectées.
- L'app suit le site sur tous ces points, ou le registre de parité dit
  pourquoi elle ne le fait pas.

Pour les **professeurs** :

- Les parcours de classe ne fuient plus dans le catalogue public et ne
  promettent plus de certificat refusé.
- Ma classe ne mène plus à des profils fermés, et « Ajouter » y est
  disponible.
- L'éditeur de leçon partage le panneau du studio, avec des erreurs MDX
  localisées à la ligne et à la colonne.
- Une classe peut recevoir une annonce depuis la console.

Pour les **administrateurs** :

- La console est sur les jetons du site, avec des listes paginées côté
  serveur, un squelette par page, des toasts et une recherche ⌘K sur les
  comptes, les leçons et les tickets.
- Le studio de leçon a un brouillon, des versions et une seule fonction de
  publication. L'import et la synchro passent par un diff et une
  confirmation.
- La fiche utilisateur 360 regroupe les gestes de support audités :
  sessions, double authentification, corrections d'XP, de série et de
  badges, export RGPD.
- La console gère aussi les tickets reliés aux bannissements, les
  certificats révocables, la modération des contenus signalés, les tâches
  planifiées et un journal d'audit au catalogue d'actions unique.
- Un compte non administrateur trouve un écran « accès réservé », avec une
  déconnexion.

Ce qui reste :

- la PR de correction des 62 constats de cette passe, C.1 en tête, et des
  relevés du rejeu ;
- le rejeu complet dans le navigateur aux quatre largeurs, et le balayage
  des 349 leçons ;
- la conversion des révisions en production, avant la version qui supprime
  `review_schedules_legacy`.
