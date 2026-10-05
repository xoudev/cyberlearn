# Backlog : composants et styles en double

> Inventaire du 5 octobre 2026, dressé sur `apps/web` et `packages/ui`. Ce qui
> est barré a été consolidé ; le reste attend sa PR. Les numéros restent fixes.

## Principes

- **Une chose, un dessin.** Un composant qui existe se réutilise ; une valeur
  qui a un token se lit par sa variable.
- **La palette est celle de `packages/ui/src/tokens.css`.** Le vocabulaire de
  page (`--fg-primary`, `--border`, `--brand-turquoise`, `--font-body`,
  `--dur-base`) est défini une fois dans `globals.css`, sur ces tokens : une
  page n'en redéclare pas de copie.
- **Une consolidation, une PR**, sans changement de comportement, avec une
  capture avant et après quand le rendu est en jeu.

## A. Fait

| # | Doublon | PR |
| --- | --- | --- |
| ~~1~~ | ~~La série : `streak-panel` (profil) et `streak-week-card` (tableau de bord)~~ | #408 |
| ~~2~~ | ~~Le vocabulaire de page recopié dans `exam.css`, `path-detail.css`, `paths-catalog-v2.css`, `glossaire.css`, et lu sans définition par `not-found`, `banned`, `catalogue`, `forum`, `story`~~ | #410 |
| ~~3~~ | ~~Les crochets d'angle, neuf copies (`Brackets`, `CornerBrackets`, `BracketCorners`)~~ | #410 |
| ~~4~~ | ~~Le bouton et la fermeture des panneaux de la barre du haut (amis, cloche)~~ | #410 |
| ~~5~~ | ~~Trois cents lignes de classes mortes dans `globals.css`~~ | #410 |

## B. Composants

| # | Doublon | Où | Piste |
| --- | --- | --- | --- |
| 6 | Huit fenêtres modales écrites à la main (fond, Échap, `role=dialog`) à côté de `modal-shell.tsx`, qui n'a qu'un seul client | `level-up-modal`, `lesson-complete-modal`, `avatar-cropper`, `share-dialog`, `note-reader`, `DeleteAccountSection`, `ban-notice`, `WrappedStory` | Toutes sur `ModalShell` ; le bloc « Niveau N atteint » une seule fois |
| 7 | L'avatar redessiné en ligne au lieu d'`AvatarView` | `navbar` (`GlyphAvatar`), `profile/page` (`HexAvatar`), `u/[username]`, `lesson-author`, `leaderboard/shared`, `locker-client` | `AvatarView` partout, une seule fonction d'initiales |
| 8 | Barres et pastilles de niveau : `XPBar` et `LevelBadge` de `packages/ui` inutilisés, six puces « LVL· / NIV· / Niv. » en ligne, deux barres d'XP en ligne | `profile`, `u/[username]`, `lesson-qa`, `lesson-complete-modal`, `student-class`, `teacher-classes`, `LeaderboardClient`, `friends-panel` | Les composants partagés, ou les supprimer s'ils ne conviennent pas |
| ~~9~~ | ~~Trois nomenclatures de rang : `computeTier`, `rankName`, `getTier` local du classement~~ | `LeaderboardClient` lit `rankName` ; `computeTier` reste le palier (Bronze à Élite), une autre chose | cette PR |
| 10 | La rareté redéfinie localement (`RARITY_*`), les cartes de badge en deux copies | `profile/page`, `locker-client`, `badges-collection`, `profile-content` | `BADGE_RARITY_*` de `packages/ui`, une seule `BadgeCard` |
| ~~11~~ | ~~Six tuiles de statistique sans composant commun~~ | `components/stat-tile.tsx`, trois tailles ; `.dash-fig` reste le chiffre en ligne du tableau de bord | cette PR |
| ~~12~~ | ~~Le fil d'Ariane « ~/cyberlearn/… » écrit en ligne dans dix-sept pages à côté de `PageHeader`~~ | `components/crumb.tsx` dans quatorze pages et `PageHeader` ; restent `verify/[publicId]` (barre d'en-tête), `account/delete/*` (pages publiques autonomes) | cette PR |
| ~~13~~ | ~~Trois `EmptyState` et cinq classes d'état vide~~ | `components/empty-state.tsx` pour les trois composants, le forum et le catalogue public ; `cls-empty`, `gs-empty`, `dash-rev-empty` restent des notes d'une ligne dans leur mise en page | cette PR |
| 14 | Les boutons : 264 `<button>` dont une centaine stylés en ligne, huit familles de classes (`.btn-*`, `.dash-btn`, `.cls-btn`, `.fp-btn`, `.cc__btn`, `.fo-btn`, `.pg-btn`, `.q-btn`), des objets `primaryButton` / `smallButton` recopiés dans quatorze labos de leçon avec cinq paddings différents | partout | Une famille de classes (primaire, fantôme, petit), les labos sur elle |
| ~~15~~ | ~~Copier dans le presse-papiers écrit trois fois~~ | `components/copy-button.tsx` : `useCopyToClipboard` et `CopyButton` | cette PR |
| 16 | Les tables `DIFF_META` / `CATEGORY_META` / `CAT_LABELS` dans une quinzaine de fichiers | `certificates`, `next-bar`, `lessons/[slug]`, `revisions`, `reviews-due`, `dashboard/page`, `challenges/[slug]`, `global-search`, `u/[username]`, `lesson-card`, `path-catalog-card`, `paths-collection` | Une table dans `@cyberlearn/lib`, lue aussi par l'app |
| 17 | Barres de progression en ligne dans dix-sept fichiers, trois seulement avec `role="progressbar"` | `quests-panel`, `mission-card`, `paths-collection`, `badges-collection`, `exam-flow`, `boss-node`, `student-class`, `teacher-classes`, `challenges-client`, `locker-client` | `PathProgress` de `packages/ui`, ou une `Bar` |
| 18 | Onglets et pastilles de filtre écrits à la main, un seul avec `role=tablist` | `profile-content`, `locker-client`, `LeaderboardClient`, `teacher-classes`, `paths-collection`, `challenges-client`, `badges-collection`, `lessons/page` | Un `Tabs` et un `Pills` |
| ~~19~~ | ~~Deux composants nommés `MissionCard` pour deux choses~~ | celui du parcours s'appelle `PathLessonCard` | cette PR |
| ~~20~~ | ~~`cn` en double (`apps/web/lib/utils.ts` et `packages/ui`), `BADGE_RARITY_ORDER` et `CompactCard` sans client~~ | `cn` de `@cyberlearn/ui` partout, `BADGE_RARITY_ORDER` supprimé ; `CompactCard` reste, la page `/dev/components` l'affiche | cette PR |

## C. Styles

| # | Doublon | Mesure | Piste |
| --- | --- | --- | --- |
| 21 | Les tokens recopiés en littéraux : `#7F7BA9` 592 fois, `#B8B5D1` 453, `#F5F5FA` 400, `#2A2560` 354, `#1F1B47` 354, `#0AFFD4` 339, `#0024FF` 138, `#0A0826` 107, `#030219` 95 ; 443 dans `globals.css` seul | ~3 200 littéraux contre 246 `var(--color-*)` | Fichier par fichier, en commençant par `globals.css`, `landing-client`, `profile/page`, `lesson-card` |
| 22 | Trois couleurs fréquentes sans variable : `#FF4757` (153, concurrent du `--color-danger` `#FF4D6D`), `#44406B` (117), `#05041A` (93) | | Décider pour chacune : un token, ou le token voisin |
| 23 | Les constantes locales `RED`, `ACCENT` (quatre valeurs, dont un `#0AFFD4` qui ignore l'accent équipé dans `osint-map`), `MONO` (quatre formes), `BORDER`, `MUTED`, `DANGER`, `AMBER` | vingt labos de leçon, `packages/ui` (`mdx-editor-panel`, `mdx-preview-frame`, `block-editor/fields`), `global-search`, `certificate-template` | Un module `lab-styles` pour les labos ; les variables pour le reste |
| 24 | Le libellé mono (majuscules, 9 à 11 px, interlettrage de 0,06 à 0,18 em) : 328 objets de style dans 79 fichiers, 131 règles dans 17 feuilles | ~25 combinaisons | Une classe `.mono-label` à trois tailles |
| 25 | La carte (bordure 1 px `#2A2560` ou `#1F1B47` et fond) : 191 objets de style, 78 règles, dix fonds différents | | `.card` et `.card--sunken` |
| 26 | Les modules CSS qui se recopient : `not-found` et `banned` (`.grid` identique, `.page`, `.card`, `.code`), `leaderboard .player` et `notes-library .folderTile`, les en-têtes « // » de `leaderboard`, `notes-library`, `forum`, `globals` | | Une feuille `page-shell` pour 404 et bannis ; une classe d'en-tête |
| 27 | Les règles `.bk` (crochets) et `.pd2-title em` / `.pc2-title em` identiques dans `exam.css`, `path-detail.css`, `paths-catalog-v2.css` | | Les remonter dans `globals.css` |
| 28 | `--radius: 0.5rem` dans les tokens alors que le site est carré (`border-radius: 0` 53 fois) | | Mettre le token à 0 et retirer les surcharges |
