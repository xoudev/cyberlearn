# Sauvegardes de la base

Le plan gratuit de Supabase ne garde **aucune sauvegarde**. Rien ne sauvegarde
la base automatiquement aujourd'hui : décision du 15 novembre 2026, à revoir
(voir « Plus tard » en bas). Cette page dit comment en faire une à la main, et
quand.

## Quand en faire une

- Avant toute migration qui supprime ou transforme des données (`DROP`,
  `ALTER ... TYPE`, un script `backfill` lancé avec `--apply`).
- Avant de lancer un script de `packages/db/prisma/` qui écrit en production.
- Une fois par mois au moins, tant qu'aucune sauvegarde automatique n'existe.

## Faire la sauvegarde

Il faut un client PostgreSQL de la même version majeure que le serveur, ou plus
récente (`pg_dump --version` ; Supabase indique la version du serveur dans
Settings, Infrastructure), et la connexion directe du projet (port 5432, pas le
pooler), celle que `migrate.yml` lit dans le secret `DIRECT_URL`.

```sh
export DIRECT_URL='postgresql://postgres:...@db.<projet>.supabase.co:5432/postgres'
stamp=$(date -u +%Y-%m-%dT%H%MZ)

pg_dump "$DIRECT_URL" \
  --format=custom --compress=9 --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  | gpg --symmetric --cipher-algo AES256 --output "cyberlearn-$stamp.dump.gpg"
```

- `public` : tout le produit. `auth` : les comptes, leurs identités et leurs
  facteurs de double authentification. `storage` : la liste des fichiers, pas
  leur contenu (avatars, PDF des certificats, icônes restent dans Supabase
  Storage ; un certificat se régénère depuis sa ligne).
- `gpg` demande une phrase de passe : au moins 32 caractères aléatoires
  (`openssl rand -base64 48`), gardée dans un gestionnaire de mots de passe.
  Sans elle, le fichier ne se relit pas.
- Le fichier contient les données personnelles de tous les comptes : jamais
  dans le dépôt (il est public), jamais en clair sur un disque partagé.

## La relire

À faire au moins une fois après la première sauvegarde, dans la pile locale
(`docs/dev/local-stack.md`), jamais d'abord par-dessus la production :

```sh
gpg --decrypt --output cyberlearn.dump cyberlearn-<date>.dump.gpg
pg_restore --list cyberlearn.dump | head
pg_restore --dbname 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  --no-owner --no-privileges --clean --if-exists --schema=public cyberlearn.dump
```

Le schéma `auth` appartient à Supabase : sur un projet neuf, restaurer ses
tables après que Supabase a créé le schéma (`--schema=auth --data-only
--disable-triggers`).

## RGPD

Une sauvegarde garde un compte effacé tant qu'elle existe. Garder les fichiers
trois mois au plus, puis les supprimer : la politique de confidentialité ne
mentionne pas encore de sauvegarde, à ajouter le jour où une sauvegarde
automatique est mise en place.

## Plus tard

Deux pistes, écartées pour l'instant :

- un workflow nocturne qui chiffre le `pg_dump` et l'envoie dans un bucket
  privé (Cloudflare R2, gratuit jusqu'à 10 Go). Pas les artefacts GitHub : le
  dépôt est public, ses artefacts se téléchargent ;
- le plan Pro de Supabase, qui fait des sauvegardes quotidiennes.
