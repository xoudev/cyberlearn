# F1 · Fondamentaux de l'informatique

DÉBUTANT · ~40 h · 8 modules · 56 leçons · refCodes `CL-LSN-01001` à `CL-LSN-01056`

**État** : rédigé. Les 56 leçons sont dans `content/lessons/f1-fondamentaux`,
avec un bilan par module du 1 au 7 (`CL-LSN-01901` à `CL-LSN-01907`), le
manifeste `content/paths/fondamentaux-informatique.json` et l'examen final
`content/quizzes/fondamentaux-informatique.json` (120 questions, 40 tirées,
seuil 75 %).

**Pour qui** : quelqu'un qui utilise un ordinateur sans savoir ce qui se passe
dedans. Aucun prérequis.

**À la fin** : on sait expliquer ce que fait un ordinateur du bouton
d'allumage à l'affichage d'une page web, lire et convertir des données en
binaire et en hexadécimal, se déplacer en ligne de commande, écrire un
algorithme simple et appliquer les réflexes de sécurité de base.

**Couvre** : les domaines matériel, systèmes et réseau de CompTIA A+ et ITF+ (niveau
découverte), et le guide d'hygiène informatique de l'ANSSI pour le module 7.

Chaque leçon est notée : **titre**, ce qu'on sait faire à la fin, *la
pratique*.

---

## Module 1 · Comment fonctionne un ordinateur

Objectif : décrire le rôle de chaque composant et suivre une instruction du
disque jusqu'au processeur.

1. **Ce qu'est un ordinateur** : distinguer matériel, logiciel, données ; le
   modèle entrée-traitement-sortie. *Quiz d'identification de composants.*
2. **Le processeur** : cycle chargement-décodage-exécution, horloge, cœurs,
   cache. *Simulateur pas à pas d'un processeur à quatre instructions.*
3. **La mémoire vive** : adresses, volatilité, pourquoi la RAM est rapide et
   petite. *Exercice : placer des données à des adresses.*
4. **Le stockage** : disque dur, SSD, hiérarchie mémoire et ordres de grandeur
   des latences. *Classer des opérations de la plus rapide à la plus lente.*
5. **La carte mère et les bus** : chipset, PCIe, USB, comment les composants
   se parlent. *Schéma à compléter.*
6. **Le démarrage** : firmware (BIOS, UEFI), chargeur, noyau, Secure Boot.
   *Remettre dans l'ordre les étapes d'un démarrage réel.*
7. **Périphériques et pilotes** : ce qu'est un pilote, pourquoi il tourne avec
   des privilèges élevés. *Lire un inventaire matériel (`lspci`, `lsusb`) dans
   le terminal simulé.*

**Quiz de module** · **Projet** : la fiche technique commentée d'une machine
réelle (la sienne ou un modèle fourni), avec le rôle de chaque composant.

## Module 2 · Représenter l'information

Objectif : convertir entre les bases et expliquer comment texte, image et son
deviennent des nombres.

1. **Le bit et l'octet** : pourquoi du binaire, unités (ko, Kio), ordres de
   grandeur. *Convertisseur d'unités.*
2. **Compter en binaire** : conversions décimal-binaire, addition. *Série
   d'exercices notés automatiquement.*
3. **L'hexadécimal** : lien avec le binaire, où on le rencontre (couleurs,
   adresses MAC, empreintes). *Conversions et lecture d'un vidage hexadécimal.*
4. **Les nombres négatifs et à virgule** : complément à deux, débordement,
   pourquoi `0.1 + 0.2 ≠ 0.3`. *Le constater dans un `CodePlayground`.*
5. **Le texte** : ASCII, Unicode, UTF-8, ce qu'est un problème d'encodage
   (« Ã© »). *Décoder des octets à la main, puis en Python.*
6. **Images et sons** : pixels, profondeur de couleur, échantillonnage.
   *Calculer le poids d'une image et d'un son non compressés.*
7. **Compression et formats** : avec et sans perte, conteneur contre codec,
   Base64. *Encoder et décoder en Base64.*

**Quiz de module** · **Projet** : décoder un message caché dans un fichier en
suivant ses couches (hexadécimal, Base64, UTF-8).

## Module 3 · Les systèmes d'exploitation

Objectif : expliquer ce que fait un système d'exploitation et comparer
Windows, Linux et macOS sur les notions communes.

1. **Le rôle d'un système d'exploitation** : noyau, espace utilisateur,
   appels système.
2. **Processus et programmes** : ce qu'est un processus, ordonnancement,
   multitâche. *Observer les processus dans le gestionnaire des tâches et avec
   `ps`.*
3. **La mémoire vue par le système** : mémoire virtuelle, pagination,
   échange sur disque.
4. **Les fichiers** : systèmes de fichiers (NTFS, ext4, APFS), chemins,
   métadonnées, extensions et types réels.
5. **Les utilisateurs et les droits** : comptes, administrateur, principe du
   moindre privilège. *Comparer UAC et `sudo`.*
6. **Installer et mettre à jour** : paquets, magasins, signatures, pourquoi
   les mises à jour comptent.
7. **Windows, Linux, macOS** : ce qui change, ce qui ne change pas.
   *Tableau d'équivalences à compléter.*
8. **La virtualisation** : machine virtuelle, hyperviseur, conteneur (première
   approche). *Schéma annoté.*

**Quiz de module** · **Projet** : le guide d'installation commenté d'une
machine virtuelle Linux, captures à l'appui.

## Module 4 · Internet et le web vus de l'intérieur

Objectif : raconter tout ce qui se passe entre la saisie d'une adresse et
l'affichage de la page.

1. **Ce qu'est un réseau** : réseau local, Internet, fournisseur d'accès.
2. **Les adresses** : adresse IP, adresse MAC, adresse publique et privée.
   *Trouver les siennes.*
3. **Les paquets** : découper, acheminer, réassembler ; la notion de
   protocole. *Animation d'un paquet de bout en bout.*
4. **Le DNS** : du nom à l'adresse, résolveurs et cache. *Résoudre un nom avec
   `nslookup` dans le terminal simulé.*
5. **Client et serveur** : ports, services, ce qu'est un serveur web.
6. **HTTP** : requête, réponse, méthodes, codes de statut, en-têtes. *Lire une
   requête réelle dans les outils du navigateur.*
7. **HTTPS et le cadenas** : ce que garantit TLS, ce qu'il ne garantit pas.
8. **Le navigateur** : HTML, CSS, JavaScript, cookies, ce que stocke un site.
   *Inspecter une page et ses cookies.*

**Quiz de module** · **Projet** : le récit technique complet, schéma à l'appui,
de l'ouverture d'une page web.

## Module 5 · Premiers pas en ligne de commande

Objectif : naviguer, manipuler des fichiers et obtenir de l'aide sans
interface graphique.

1. **Pourquoi le terminal** : shell, terminal, invite de commandes.
2. **Se repérer** : `pwd`, `ls`, `cd`, chemins absolus et relatifs.
   *Parcours guidé dans le terminal simulé.*
3. **Manipuler des fichiers** : `mkdir`, `cp`, `mv`, `rm`, et ce que
   `rm` ne pardonne pas.
4. **Lire des fichiers** : `cat`, `less`, `head`, `tail`.
5. **Obtenir de l'aide** : `man`, `--help`, lire une page de manuel.
6. **Chercher** : `find`, `grep`, les jokers.
7. **PowerShell en parallèle** : les mêmes gestes sous Windows.

**Quiz de module** · **Projet** : organiser une arborescence de projet en
désordre, uniquement en ligne de commande, selon un cahier des charges vérifié
automatiquement.

## Module 6 · Penser comme un programmeur

Objectif : décomposer un problème et écrire un algorithme correct en
pseudo-code puis en Python.

1. **Ce qu'est un algorithme** : entrée, étapes, sortie, terminaison.
2. **Variables et types** : première rencontre en Python. *`CodePlayground`.*
3. **Conditions** : logique booléenne, tables de vérité, ET, OU, NON.
4. **Boucles** : répéter, compter, parcourir.
5. **Fonctions** : découper un problème, paramètres et retour.
6. **Déboguer** : lire un message d'erreur, tracer à la main.
   *Corriger trois programmes cassés (`PythonChallenge`).*
7. **L'efficacité** : pourquoi certains algorithmes sont lents, première idée
   de la complexité. *Comparer une recherche linéaire et dichotomique.*

**Quiz de module** · **Projet** : un petit jeu en Python (devinette, pendu)
avec des tests automatiques.

## Module 7 · Les bons réflexes de sécurité numérique

Objectif : protéger ses comptes, ses appareils et ses données selon les
recommandations de l'ANSSI.

1. **Pourquoi on est une cible** : motivations, attaques opportunistes contre
   attaques ciblées.
2. **Les mots de passe** : longueur, réutilisation, gestionnaires, phrases de
   passe. *Évaluer des politiques de mots de passe.*
3. **La double authentification** : facteurs, TOTP, clés physiques, et
   pourquoi le SMS est le plus faible.
4. **Reconnaître l'hameçonnage** : les indices, les domaines trompeurs.
   *Trier une boîte de réception d'exemples.*
5. **Mettre à jour et sauvegarder** : la règle 3-2-1.
6. **Les réseaux publics et le Wi-Fi** : ce qu'un réseau voit, ce qu'HTTPS
   protège.
7. **Que faire en cas de problème** : compte piraté, appareil perdu,
   rançongiciel ; cybermalveillance.gouv.fr.

**Quiz de module** · **Projet** : l'audit de sécurité de son propre usage
numérique, avec un plan d'action.

## Module 8 · Projet de fin de parcours

Objectif : réinvestir tout le parcours sur un cas complet.

1. **Le cahier des charges** : inventorier, diagnostiquer et documenter le
   poste d'une petite association.
2. **L'inventaire matériel et logiciel** : en ligne de commande.
3. **Le diagnostic réseau** : adresses, DNS, connectivité.
4. **Les recommandations de sécurité** : priorisées et justifiées.
5. **Le rendu** : un dossier technique relu par une grille de critères, et
   une correction commentée.

**Examen de parcours** : 40 questions tirées d'un pool de 120, seuil 75 %.
