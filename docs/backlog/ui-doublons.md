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
| ~~6~~ | ~~Huit fenêtres modales écrites à la main (fond, Échap, `role=dialog`) à côté de `modal-shell.tsx`, qui n'a qu'un seul client~~ | Les huit sur `ModalShell`, plus les deux écrans d'attente du récap ; le shell gagne trois niveaux de chrome (`panel`, `plain`, `none`), `dismissable`, `accent`, `meta`, le piège de Tab et la pile des fenêtres ouvertes ; « Niveau N atteint » est `components/level-reached.tsx`, en deux tailles | cette PR |
| ~~7~~ | ~~L'avatar redessiné en ligne au lieu d'`AvatarView`~~ | `AvatarView` dans la barre du haut, le profil, le profil public et l'auteur d'une leçon ; le classement lit `initialsOf` ; le casier garde son initiale, il n'a pas d'avatar à montrer | cette PR |
| ~~8~~ | ~~Barres et pastilles de niveau~~ | `levelLabel` (« Niv. 7 ») partout, app comprise ; `XpProgress` pour les deux barres ; `XPBar`, `LevelBadge`, `RarityBadge`, `PathProgress`, `NotificationBell` supprimés de `packages/ui`, arrondis et sans client | cette PR |
| ~~9~~ | ~~Trois nomenclatures de rang : `computeTier`, `rankName`, `getTier` local du classement~~ | `LeaderboardClient` lit `rankName` ; `computeTier` reste le palier (Bronze à Élite), une autre chose | #412 |
| ~~10~~ | ~~La rareté redéfinie localement (`RARITY_*`), les cartes de badge en deux copies~~ | `BADGE_RARITY_*`, `BADGE_RARITY_GRADIENT` et `rarestOf` dans `packages/ui` ; une seule `BadgeCard` (`components/badge-card.tsx`) sur la page des badges et le profil | cette PR |
| ~~11~~ | ~~Six tuiles de statistique sans composant commun~~ | `components/stat-tile.tsx`, trois tailles ; `.dash-fig` reste le chiffre en ligne du tableau de bord | #412 |
| ~~12~~ | ~~Le fil d'Ariane « ~/cyberlearn/… » écrit en ligne dans dix-sept pages à côté de `PageHeader`~~ | `components/crumb.tsx` dans quatorze pages et `PageHeader` ; restent `verify/[publicId]` (barre d'en-tête), `account/delete/*` (pages publiques autonomes) | #412 |
| ~~13~~ | ~~Trois `EmptyState` et cinq classes d'état vide~~ | `components/empty-state.tsx` pour les trois composants, le forum et le catalogue public ; `cls-empty`, `gs-empty`, `dash-rev-empty` restent des notes d'une ligne dans leur mise en page | #412 |
| ~~14~~ | ~~Les boutons : 264 `<button>` dont une centaine stylés en ligne, huit familles de classes (`.btn-*`, `.dash-btn`, `.cls-btn`, `.fp-btn`, `.cc__btn`, `.fo-btn`, `.pg-btn`, `.q-btn`), des objets `primaryButton` / `smallButton` recopiés dans quatorze labos de leçon avec cinq paddings différents~~ | `.btn` dans `globals.css` : les tons `--accent`, `--danger`, `--warning`, `--gold`, `--ghost` pour le bord seul (combinable avec un ton), `--sm`, `--lg`, `--block`. Les dix familles de classes converties et leurs 50 règles supprimées ; 45 boutons stylés en ligne convertis par script (fond bleu, accent, rouge ou bord seul), les aides de survol `.btn-blue`, `.btn-ghost`, `.btn-teal` supprimées ; les objets `primaryButton` / `smallButton` des sept labos qui en avaient remplacés par les classes. Restent les boutons dont le fond dépend d'un état (un choix, un onglet, un filtre maison) : ce sont des commutateurs, pas des boutons d'action | cette PR |
| ~~15~~ | ~~Copier dans le presse-papiers écrit trois fois~~ | `components/copy-button.tsx` : `useCopyToClipboard` et `CopyButton` | #412 |
| ~~16~~ | ~~Les tables `DIFF_META` / `CATEGORY_META` / `CAT_LABELS` dans une quinzaine de fichiers~~ | `packages/lib/src/content/vocabulary.ts` (`CATEGORY_META`, `DIFFICULTY_META`, `categoryMeta`, `difficultyMeta`), les couleurs dans `@cyberlearn/tokens` ; dix-huit fichiers la lisent, l'app comprise ; les suffixes de classes CSS (`cyber`/`dev`/`net`, `beg`/`int`/`adv`/`exp`) restent locaux ; `KindGlyph` et `DiffBars` sortent de `path-catalog-card` pour la collection et la page d'un parcours | cette PR |
| ~~17~~ | ~~Barres de progression en ligne dans dix-sept fichiers, trois seulement avec `role="progressbar"`~~ | `components/progress-bar.tsx` : cinq hauteurs, le dégradé de marque, le ton d'alerte ou une couleur, un repère, une pointe, l'animation ; `role="progressbar"` et un libellé pour toutes, dans treize fichiers. Restent `xp-progress` (ses rayures et son repère de niveau), la ligne de route du tableau de bord (un trajet, pas une jauge) et les barres du récap (une par diapositive, animées) | cette PR |
| ~~18~~ | ~~Onglets et pastilles de filtre écrits à la main, un seul avec `role=tablist`~~ | `components/tabs.tsx` (`role="tablist"`, `aria-selected`, le compte en pastille, un bord de rangée) pour le profil, le casier, le classement et la classe ; `components/pills.tsx` (`aria-pressed`, le losange dans la couleur de ce qu'on filtre, le compte) pour le catalogue des parcours, les défis et les badges ; `.cls-tab*`, `.x-pill*` et `.pc2-pill*` supprimés. La page des leçons n'avait pas de rangée de pastilles (un `Select`) | cette PR |
| ~~19~~ | ~~Deux composants nommés `MissionCard` pour deux choses~~ | celui du parcours s'appelle `PathLessonCard` | #412 |
| ~~20~~ | ~~`cn` en double (`apps/web/lib/utils.ts` et `packages/ui`), `BADGE_RARITY_ORDER` et `CompactCard` sans client~~ | `cn` de `@cyberlearn/ui` partout ; `BADGE_RARITY_ORDER` revient dans `badge-tokens` comme seule table de rareté (ligne 10), avec un test ; `CompactCard` reste, la page `/dev/components` l'affiche | #412 |

## C. Styles

| # | Doublon | Mesure | Piste |
| --- | --- | --- | --- |
| 21 | Les tokens recopiés en littéraux : `#7F7BA9` 592 fois, `#B8B5D1` 453, `#F5F5FA` 400, `#2A2560` 354, `#1F1B47` 354, `#0AFFD4` 339, `#0024FF` 138, `#0A0826` 107, `#030219` 95 ; 443 dans `globals.css` seul | ~3 200 littéraux contre 246 `var(--color-*)` | Fichier par fichier, en commençant par `globals.css`, `landing-client`, `profile/page`, `lesson-card` |
| 22 | Trois couleurs fréquentes sans variable : `#FF4757` (153, concurrent du `--color-danger` `#FF4D6D`), `#44406B` (117), `#05041A` (93) | | Décider pour chacune : un token, ou le token voisin |
| ~~23~~ | ~~Les constantes locales `RED`, `ACCENT` (quatre valeurs, dont un `#0AFFD4` qui ignore l'accent équipé dans `osint-map`), `MONO` (quatre formes), `BORDER`, `MUTED`, `DANGER`, `AMBER`~~ | `packages/ui/src/lib/palette.ts` (`ACCENT`, `MONO`, `MONO_STYLE`, `RED`, `DANGER`, `AMBER`, `BORDER`, `MUTED`), exporté par `@cyberlearn/ui` ; vingt-huit fichiers l'importent au lieu de déclarer les leurs, la carte OSINT suit l'accent équipé. `python-status` garde son objet `MONO` (une taille et un interlignage à lui), `block-editor/fields` son fond de champ : ce ne sont pas ces constantes | cette PR |
| ~~24~~ | ~~Le libellé mono (majuscules, 9 à 11 px, interlettrage de 0,06 à 0,18 em) : 328 objets de style dans 79 fichiers, 131 règles dans 17 feuilles~~ | `.mono-label` dans `globals.css`, trois tailles (`--xs` 9,5 px, 10,5 px, `--md` 12 px), la graisse et la couleur restant à l'élément ; 238 objets de style convertis dans 48 fichiers par script (`style={{ fontFamily mono, fontSize, letterSpacing, textTransform }}` devient la classe, le reste de l'objet reste). Restent les objets avec un `...spread` (ligne 23, les constantes des labos) et les règles des feuilles, qui habillent des éléments qui ont déjà leur classe | cette PR |
| ~~25~~ | ~~La carte (bordure 1 px `#2A2560` ou `#1F1B47` et fond) : 191 objets de style, 78 règles, dix fonds différents~~ | `.card` (bord `#2A2560`, fond `#0A0826`), `.card--sunken` (bord `#1F1B47`, fond `#05041A`), `.card--ghost` (le bord seul) dans `globals.css` ; les objets de style convertis par script sur les blocs (`div`, `section`, `li`, `a`…), le fond en dégradé ou en variable et les éléments de formulaire laissés tels quels ; les 78 règles des feuilles habillent des éléments qui ont déjà leur classe | cette PR |
| ~~26~~ | ~~Les modules CSS qui se recopient : `not-found` et `banned` (`.grid` identique, `.page`, `.card`, `.code`), `leaderboard .player` et `notes-library .folderTile`, les en-têtes « // » de `leaderboard`, `notes-library`, `forum`, `globals`~~ | `app/standalone-page.css` (`.standalone-page`, `--danger`, `__grid`, `__card`) pour la 404 et la page des bannis, l'accent et la lueur par variable ; `.player` et `.folderTile` sont des `card card--sunken` ; `.section-head` (« // ») dans `globals.css` pour le classement et le forum. `.pg-eyebrow` reste : c'est le surtitre d'une page, pas l'en-tête d'une section | cette PR |
| ~~27~~ | ~~Les règles `.bk` (crochets) et `.pd2-title em` / `.pc2-title em` identiques dans `exam.css`, `path-detail.css`, `paths-catalog-v2.css`~~ | `.bk*` une fois dans `globals.css` (16 px, `--bk-color` sinon l'accent) ; `.gradient-title em` pour les quatre titres (examen, parcours, catalogue, guide) | cette PR |
| ~~28~~ | ~~`--radius: 0.5rem` dans les tokens alors que le site est carré (`border-radius: 0` 53 fois)~~ | `--radius: 0` dans `tokens.css`, l'échelle `--radius-sm` à `-xl` sur lui ; les 23 `border-radius: 0` des feuilles et les 25 `borderRadius: 0` en ligne retirés (Tailwind met déjà les contrôles de formulaire à zéro) | cette PR |
