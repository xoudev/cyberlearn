# F2 · Linux : de zéro à l'autonomie

DÉBUTANT → INTERMÉDIAIRE · ~60 h · 11 modules · 80 leçons · refCodes
`CL-LSN-02001` à `CL-LSN-02080`

**Pour qui** : quelqu'un qui a suivi F1 ou sait déjà se servir d'un terminal.
Prérequis : F1 module 5 (ou le test de positionnement).

**À la fin** : on administre seul un serveur Linux : comptes, droits,
logiciels, services, stockage, réseau, scripts d'automatisation, journaux et
durcissement de base.

**Couvre** : le programme LPIC-1 (101 et 102) et Linux Essentials, et le guide
de l'ANSSI « Recommandations de configuration d'un système GNU/Linux » pour le
module 11.

**Pratique** : les modules 1 à 4 tiennent avec le terminal simulé actuel. À
partir du module 5, les exercices supposent le Linux réel dans le navigateur
(chantier T6, labs de niveau 2) ; sans lui, ces modules ne sont pas publiés.

Chaque leçon est notée : **titre**, ce qu'on sait faire à la fin, *la
pratique*.

---

## Module 1 · Découvrir Linux et le shell

1. **Linux, GNU et les distributions** : noyau et système, Debian, Red Hat,
   Arch, et comment choisir.
2. **Le shell et le terminal** : Bash, invite, prompt, ce qui se passe quand
   on tape Entrée. *Premières commandes.*
3. **L'anatomie d'une commande** : options courtes et longues, arguments,
   guillemets. *Série d'exercices corrigés.*
4. **L'aide intégrée** : `man` et ses sections, `info`, `--help`, `apropos`.
5. **L'historique et l'édition de ligne** : `history`, raccourcis, complétion.
6. **Les variables d'environnement** : `PATH`, `HOME`, `export`, pourquoi une
   commande est « introuvable ».
7. **Éditer un fichier** : `nano`, puis les bases de `vim` (modes, sauvegarder,
   quitter). *Défi : modifier un fichier de configuration sans quitter le
   terminal.*

**Quiz** · **Projet** : personnaliser son environnement (`.bashrc`, alias,
prompt) selon un cahier des charges.

## Module 2 · Fichiers et arborescence

1. **La hiérarchie standard** : `/etc`, `/var`, `/home`, `/usr`, `/tmp`, et
   pourquoi.
2. **Naviguer efficacement** : chemins, `~`, `-`, `pushd`.
3. **Créer, copier, déplacer, supprimer** : options sûres (`-i`, `-n`), pièges
   de `rm -r`.
4. **Jokers et expansion** : `*`, `?`, `[ ]`, accolades, ce que le shell fait
   avant la commande.
5. **Liens physiques et symboliques** : inodes, `ln`, ce qui casse quand on
   déplace.
6. **Trouver des fichiers** : `find` en profondeur (type, taille, date,
   `-exec`), `locate`.
7. **Archiver et compresser** : `tar`, `gzip`, `xz`, `zip`.
8. **Les métadonnées** : `stat`, horodatages, `file` et types réels.

**Quiz** · **Projet** : retrouver, trier et archiver les fichiers d'un serveur
selon des critères donnés, vérification automatique.

## Module 3 · Travailler le texte

1. **Entrées, sorties, erreurs** : flux standard, `>`, `>>`, `2>`, `&>`.
2. **Les tubes** : composer des commandes, philosophie Unix.
3. **Filtrer** : `grep` et ses options utiles.
4. **Les expressions régulières** : basiques et étendues, ancres, classes,
   quantificateurs. *Série graduée de motifs à écrire.*
5. **Couper et trier** : `cut`, `sort`, `uniq`, `wc`, `tr`.
6. **Transformer avec `sed`** : substitution, suppression, édition en place.
7. **Analyser avec `awk`** : champs, conditions, sommes.
8. **Comparer** : `diff`, `comm`, correctifs avec `patch`.

**Quiz** · **Projet** : produire un rapport d'activité à partir d'un journal
d'accès web réel, en une chaîne de commandes.

## Module 4 · Utilisateurs, groupes et permissions

1. **Comptes et groupes** : `/etc/passwd`, `/etc/group`, `/etc/shadow`, `id`.
2. **Gérer les comptes** : `useradd`, `usermod`, `passwd`, verrouiller et
   expirer.
3. **Les permissions** : lecture, écriture, exécution, sur un fichier et sur un
   répertoire.
4. **Modifier les permissions** : `chmod` symbolique et octal, `chown`,
   `umask`.
5. **Les bits spéciaux** : setuid, setgid, sticky, et pourquoi setuid est
   sensible.
6. **Les listes de contrôle d'accès** : `getfacl`, `setfacl`.
7. **Devenir administrateur** : `su`, `sudo`, `sudoers`, journalisation.
8. **Les limites de chaque compte** : `ulimit`, PAM (vue d'ensemble).

**Quiz** · **Projet** : organiser les droits d'une équipe (répertoires
partagés, rôles, accès administrateur limité) et prouver chaque règle.

## Module 5 · Processus, signaux et ressources

1. **Voir les processus** : `ps`, arbre, états, PID et PPID.
2. **Surveiller en direct** : `top`, `htop`, charge système.
3. **Les signaux** : `kill`, `SIGTERM` contre `SIGKILL`, `trap`.
4. **Premier et arrière-plan** : `&`, `jobs`, `fg`, `bg`, `nohup`.
5. **Priorités** : `nice`, `renice`.
6. **Mémoire et disque** : `free`, `vmstat`, `df`, `du`, `iostat`.
7. **Le système de fichiers `/proc`** : ce que le noyau expose.

**Quiz** · **Lab** : diagnostiquer une machine lente (processus qui fuit,
disque plein) et la remettre d'aplomb.

## Module 6 · Installer et gérer des logiciels

1. **Les gestionnaires de paquets** : `apt` et `dnf`, dépôts, dépendances.
2. **Chercher, installer, retirer** : les commandes du quotidien.
3. **Les dépôts et leurs signatures** : clés, sources tierces, risques.
4. **Mettre à jour un système** : mises à jour de sécurité, redémarrages.
5. **Compiler depuis les sources** : `configure`, `make`, et quand l'éviter.
6. **Les autres formats** : Snap, Flatpak, AppImage, binaires isolés.

**Quiz** · **Projet** : préparer un serveur avec une liste de logiciels,
depuis les dépôts officiels et un dépôt tiers ajouté proprement.

## Module 7 · Scripts Bash

1. **Premier script** : shebang, droits d'exécution, arguments.
2. **Variables et substitutions** : `$( )`, arithmétique, guillemets et
   découpage des mots.
3. **Conditions** : `test`, `[[ ]]`, codes de retour.
4. **Boucles** : `for`, `while`, lire un fichier ligne à ligne.
5. **Fonctions** : portée, retour, bibliothèque de fonctions.
6. **Robustesse** : `set -euo pipefail`, gestion des erreurs, `trap`.
7. **Entrées de l'utilisateur et options** : `read`, `getopts`.
8. **Déboguer et vérifier** : `bash -x`, ShellCheck.
9. **Planifier** : `cron`, les minuteurs systemd.

**Quiz** · **Projet** : un script de sauvegarde avec options, rotation,
journal et code de retour fiable, testé par des cas automatiques.

## Module 8 · Services, systemd et journaux

1. **Le démarrage d'un Linux moderne** : du noyau à systemd.
2. **Gérer un service** : `systemctl` start, enable, status.
3. **Écrire une unité** : un service maison, dépendances, redémarrage.
4. **Les cibles** : niveaux de fonctionnement, mode de secours.
5. **Le journal** : `journalctl`, filtres, persistance.
6. **syslog et rsyslog** : les fichiers de `/var/log`, la rotation.
7. **Diagnostiquer un service qui ne démarre pas** : méthode.

**Quiz** · **Lab** : transformer une application en service fiable (redémarrage
automatique, journaux, démarrage au boot).

## Module 9 · Disques, systèmes de fichiers et sauvegardes

1. **Disques et partitions** : MBR, GPT, `lsblk`, `fdisk`, `parted`.
2. **Les systèmes de fichiers** : ext4, XFS, Btrfs, créer et vérifier.
3. **Monter** : `mount`, `/etc/fstab`, UUID.
4. **LVM** : volumes physiques, groupes, volumes logiques, agrandir à chaud.
5. **Le RAID logiciel** : niveaux et compromis.
6. **Le chiffrement du disque** : LUKS.
7. **Sauvegarder et restaurer** : `rsync`, instantanés, tester une
   restauration.

**Quiz** · **Lab** : ajouter un disque, l'intégrer à LVM, chiffrer un volume et
prouver qu'une sauvegarde se restaure.

## Module 10 · Linux en réseau

1. **Configurer une interface** : `ip`, NetworkManager, adresses statiques.
2. **Diagnostiquer** : `ping`, `traceroute`, `ss`, `dig`.
3. **Noms et résolution** : `/etc/hosts`, `resolv.conf`.
4. **SSH** : connexion, clés, `ssh-agent`, configuration du client.
5. **Durcir SSH** : pas de mot de passe, pas de root, restrictions.
6. **Transférer des fichiers** : `scp`, `rsync`, `sftp`.
7. **Le pare-feu** : `nftables` et `ufw`, politique par défaut.

**Quiz** · **Lab** : rendre un serveur accessible uniquement en SSH par clé,
derrière un pare-feu à politique restrictive.

## Module 11 · Projet de fin de parcours

1. **Le cahier des charges** : mettre en service le serveur d'une petite
   équipe (web, partage de fichiers, sauvegardes).
2. **Installer et organiser** : comptes, droits, logiciels.
3. **Les services** : serveur web, service maison, journaux.
4. **Sauvegarder et superviser** : script, planification, alertes simples.
5. **Durcir** : recommandations de l'ANSSI appliquées et justifiées.
6. **Le rendu** : dossier d'exploitation, vérification automatique de l'état
   du serveur, correction commentée.

**Examen de parcours** : 50 questions tirées d'un pool de 150, seuil 75 %, plus
une épreuve pratique chronométrée dans le terminal.
