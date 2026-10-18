/**
 * The console's map, in one place: the sections of the sidebar, every page
 * and action the quick search of the top bar can open, and the names the top
 * bar's breadcrumb gives the segments of an address.
 *
 * The three used to be three lists in two components, and they drifted: the
 * sidebar gained Tournois, the quick search never did, and the breadcrumb did
 * not know classes, tournaments, moderation, sync, reports, notes or
 * structure, so /tournaments read "Console" and /lessons/sync stopped at
 * "Leçons". A test checks every page of the console against this file.
 */

/** The icons admin-sidebar.tsx draws. */
export type ConsoleNavIcon =
  | "dash"
  | "book"
  | "route"
  | "badge"
  | "users"
  | "certificate"
  | "target"
  | "flag"
  | "ticket"
  | "shield"
  | "alert"
  | "flask"
  | "log"
  | "cog";

/** The counts the layout reads for the sidebar's badges. */
export type ConsoleCountKey =
  | "lessons"
  | "paths"
  | "badges"
  | "challenges"
  | "users"
  | "tickets"
  /** Contents with an open report: what learners are waiting on the team for. */
  | "reports";

export interface ConsoleSection {
  label: string;
  href: string;
  icon: ConsoleNavIcon;
  /** The count shown beside it, when it has one. */
  count?: ConsoleCountKey;
  /** Other words the quick search finds it by. */
  keywords: readonly string[];
}

/** The sidebar's "Gestion" block, in its order. */
export const CONSOLE_MAIN_SECTIONS: readonly ConsoleSection[] = [
  {
    label: "Aperçu",
    href: "/dashboard",
    icon: "dash",
    keywords: ["tableau de bord", "dashboard", "accueil"],
  },
  {
    label: "Leçons",
    href: "/lessons",
    icon: "book",
    count: "lessons",
    keywords: ["contenu", "cours"],
  },
  { label: "Parcours", href: "/paths", icon: "route", count: "paths", keywords: ["contenu"] },
  { label: "Badges", href: "/badges", icon: "badge", count: "badges", keywords: ["récompenses"] },
  { label: "Classes", href: "/classes", icon: "users", keywords: ["élèves", "professeurs"] },
  {
    label: "Challenges",
    href: "/challenges",
    icon: "target",
    count: "challenges",
    keywords: ["défis", "ctf"],
  },
  { label: "Tournois", href: "/tournaments", icon: "flag", keywords: ["ctf", "compétition"] },
  {
    label: "Utilisateurs",
    href: "/users",
    icon: "users",
    count: "users",
    keywords: ["comptes", "membres"],
  },
  {
    label: "Certificats",
    href: "/certificates",
    icon: "certificate",
    keywords: ["diplômes", "attestations", "révocation"],
  },
  { label: "Tickets", href: "/tickets", icon: "ticket", count: "tickets", keywords: ["support"] },
  {
    label: "Modération",
    href: "/moderation",
    icon: "shield",
    keywords: ["signalements", "messages"],
  },
  {
    label: "Signalements",
    href: "/moderation/reports",
    icon: "alert",
    count: "reports",
    keywords: ["contenus signalés", "forum", "solutions", "ressources", "modération"],
  },
];

/** The sidebar's "Système" block, in its order. */
export const CONSOLE_SYSTEM_SECTIONS: readonly ConsoleSection[] = [
  { label: "Banc d'essai", href: "/lab", icon: "flask", keywords: ["lab", "test"] },
  { label: "Audit log", href: "/audit", icon: "log", keywords: ["journal", "historique"] },
  { label: "Paramètres", href: "/settings", icon: "cog", keywords: ["réglages", "configuration"] },
];

/** Where the quick search can go: a page to read, or an action to start. */
export interface ConsoleDestination {
  label: string;
  href: string;
  kind: "page" | "action";
  /** Other words it is found by: "signalements" finds both reported lists. */
  keywords: readonly string[];
}

/** The pages under a section that the sidebar does not list. */
const SUB_PAGES: readonly ConsoleDestination[] = [
  {
    label: "Inscriptions en attente",
    href: "/users/pending",
    kind: "page",
    keywords: ["comptes", "confirmation", "e-mail"],
  },
  {
    label: "Leçons archivées",
    href: "/lessons/archives",
    kind: "page",
    keywords: ["archives"],
  },
  {
    label: "Parcours archivés",
    href: "/paths/archives",
    kind: "page",
    keywords: ["archives"],
  },
  {
    label: "Questions signalées",
    href: "/lessons/reports",
    kind: "page",
    keywords: ["signalements", "quiz", "erreurs"],
  },
  {
    label: "Notes signalées",
    href: "/moderation/notes",
    kind: "page",
    keywords: ["signalements", "partage", "modération"],
  },
  {
    label: "Contenus publiés",
    href: "/moderation/content",
    kind: "page",
    keywords: ["masquer", "réafficher", "forum", "solutions", "ressources", "modération"],
  },
  {
    label: "Établissements et promos",
    href: "/classes/structure",
    kind: "page",
    keywords: ["structure", "écoles", "lycées", "promotions"],
  },
];

/** The actions: a form to fill, or a job to run. */
const ACTIONS: readonly ConsoleDestination[] = [
  { label: "Nouvelle leçon", href: "/lessons/new", kind: "action", keywords: ["créer"] },
  {
    label: "Importer des leçons MDX",
    href: "/lessons/import",
    kind: "action",
    keywords: ["import", "mdx", "fichier"],
  },
  {
    label: "Synchroniser avec le dépôt",
    href: "/lessons/sync",
    kind: "action",
    keywords: ["synchro", "sync", "github", "dépôt"],
  },
  { label: "Nouveau parcours", href: "/paths/new", kind: "action", keywords: ["créer"] },
  { label: "Nouveau badge", href: "/badges/new", kind: "action", keywords: ["créer"] },
  {
    label: "Nouvelle classe",
    href: "/classes/new",
    kind: "action",
    keywords: ["créer", "établissement", "promo"],
  },
  { label: "Nouveau challenge", href: "/challenges/new", kind: "action", keywords: ["créer"] },
  {
    label: "Nouveau tournoi",
    href: "/tournaments/new",
    kind: "action",
    keywords: ["créer", "ctf"],
  },
];

/** Every destination of the quick search: the sections, their sub-pages, then the actions. */
export const CONSOLE_DESTINATIONS: readonly ConsoleDestination[] = [
  ...[...CONSOLE_MAIN_SECTIONS, ...CONSOLE_SYSTEM_SECTIONS].map(
    (section): ConsoleDestination => ({
      label: section.label,
      href: section.href,
      kind: "page",
      keywords: section.keywords,
    }),
  ),
  ...SUB_PAGES,
  ...ACTIONS,
];

/**
 * How the breadcrumb names a segment of an address. A key with a slash names
 * a segment under one parent only, where the generic name would be wrong:
 * "Nouvelle" for a lesson, "Créer" for the page that creates classes, promos
 * and establishments. A segment it does not know - an id - is left out.
 *
 * A Map rather than an object, so that a segment called "constructor" is not
 * found on Object.prototype.
 */
const SEGMENT_LABELS: ReadonlyMap<string, string> = new Map([
  ["dashboard", "Aperçu"],
  ["lessons", "Leçons"],
  ["paths", "Parcours"],
  ["badges", "Badges"],
  ["classes", "Classes"],
  ["challenges", "Challenges"],
  ["tournaments", "Tournois"],
  ["users", "Utilisateurs"],
  ["certificates", "Certificats"],
  ["tickets", "Tickets"],
  ["moderation", "Modération"],
  ["lab", "Banc d'essai"],
  ["audit", "Audit log"],
  ["settings", "Paramètres"],
  ["pending", "Inscriptions en attente"],
  ["archives", "Archives"],
  ["reports", "Questions signalées"],
  ["sync", "Synchronisation"],
  ["notes", "Notes signalées"],
  ["moderation/reports", "Signalements"],
  ["moderation/content", "Contenus publiés"],
  ["structure", "Établissements et promos"],
  ["new", "Nouveau"],
  ["lessons/new", "Nouvelle"],
  ["classes/new", "Créer"],
  ["edit", "Édition"],
  ["import", "Import MDX"],
  ["quiz", "Quiz"],
]);

/**
 * The section of the sidebar an address sits under: the most specific when
 * two match, so /moderation/reports lights Signalements and not Modération
 * too. Null when the address is under none of them.
 */
export function activeSectionHref(
  pathname: string,
  sections: readonly ConsoleSection[],
): string | null {
  return sections
    .map((section) => section.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .reduce<string | null>(
      (best, href) => (best === null || href.length > best.length ? href : best),
      null,
    );
}

/** The breadcrumb of a console address: one name per segment it knows. */
export function breadcrumbOf(pathname: string): string[] {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const crumbs: string[] = [];
  segments.forEach((segment, index) => {
    const parent = segments[index - 1];
    const label =
      (parent !== undefined ? SEGMENT_LABELS.get(`${parent}/${segment}`) : undefined) ??
      SEGMENT_LABELS.get(segment);
    if (label !== undefined) crumbs.push(label);
  });
  return crumbs;
}
