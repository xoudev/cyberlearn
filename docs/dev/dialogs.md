# Dialogs, drawers and pages

The site draws its windows with two primitives from `@cyberlearn/ui`, and opens
the ones that need an address through one hook and one host. This page says
when something should be a window rather than a page, and how to add one.

## Window or page

A **dialog or a drawer** fits what is done or read without leaving what the
reader was doing:

- a thin form (a new forum topic, a support request);
- a single action or a confirmation (challenge a friend, delete an account);
- a small detail view (a support ticket, the release notes, a note).

A **page** fits what stands on its own:

- it needs a shareable address that loads alone, as the thing itself rather
  than as an aside (a lesson, a challenge, a public profile);
- it polls or updates live (a duel);
- it runs a machine (a tournament challenge with its Linux machine);
- it is the target of a notification or of an e-mail link (a duel, the
  account deletion landing pages).

When a page becomes a window, its address stays alive with a redirect in
`apps/web/next.config.ts` to the page that hosts the window, with the window's
parameter (`/settings/:section` goes to `/dashboard?settings=:section`). Make
the redirect `permanent: false`: a browser must not remember where an address
of the site goes. An old address that differs from the new one by a query
parameter only (`/duels?ami=<id>`) is translated by its page with
`redirect()`: a redirect in `next.config.ts` carries the request's query
along, the parameter it matched on included.

## Dialog or drawer

| Primitive | Use it for | Behaviour |
|---|---|---|
| `ModalShell` | A short exchange that asks for an answer: a confirmation, a form of a few fields, a notice | Centred over the page. Escape and the backdrop close it (unless `dismissable={false}`), the page is locked, Tab stays inside, a dialog opened over another gets the keyboard. Three amounts of chrome: `panel`, `plain`, `none` |
| `SideDrawer` | Something taller, read beside the page: a list, a thread, a set of sections (the settings) | Against the right edge, a header with its name and a close button, an Escape hint at the bottom. Modal by default: a `ModalShell` without chrome, same behaviour |
| `SideDrawer modal={false}` | Something used while working in the page (the notes of a lesson) | Docked: no backdrop, no scroll lock, no focus trap, the page stays in use beside it. Escape closes it when the focus is in it |

A `SideDrawer` moves the focus into it when it opens and gives it back to what
opened it when it closes, unless the reader has put it elsewhere in the page
in the meantime. Pass `returnFocus={false}` in the render that closes it when
the page changed under it (the settings drawer does, on a navigation): the
opener may still be on screen, but a new page is read from its start. A
`ModalShell` focuses itself on open; giving the focus back is its caller's.

Their classes live in `packages/ui/src/dialogs.css`, which both apps import
after the tokens. The console can use them as they are.

The shadcn `Sheet` (`apps/web/components/ui/sheet.tsx`) is the sidebar's on a
phone and nothing else's. Do not build a window on it.

## Opened by the address

A window that a link, a redirect or the browser's history should be able to
open has its open state in the address: `?news=1` open, no `news` closed.

- `useQueryDialog(key)` (`apps/web/hooks/use-query-dialog.ts`) returns the
  parameter's `value` (null when closed), `open(value = "1")` and `close()`.
  `open` adds a step to the history, so Back closes the window and Forward
  opens it again. `close` steps back over that step, or takes the parameter
  off an address the window came with (a link, a redirect, a reload). Both go
  through the History API, which Next follows in `useSearchParams` without
  asking the server for anything: the page under the window does not move.
  The hook only steps back from a step it knows this page load added: the
  mark `open` leaves on the entry is dropped by Next at the next refresh or
  revalidating server action, so the hook keeps its own record of the step as
  well, and a mark from before a reload never sends the reader back into the
  page that reload threw away.
- `QueryDialogHost` (`apps/web/components/query-dialog-host.tsx`) is mounted
  once in the app shell (`apps/web/components/app-shell.tsx`), which the
  `(app)` layout draws every signed-in page in, and a public profile too when
  a session reads it. It draws the registered window the address names, over
  any page of the signed-in site.
- `QUERY_DIALOGS` (`apps/web/components/query-dialogs.ts`) maps each parameter
  to its window.

The windows of the site today:

| Parameter | Window | Opened from | Old address, redirected |
|---|---|---|---|
| `settings=<section>` | The settings, a drawer (registered) | The navbar's gear, any link to `/settings/...` | `/settings/:section` to `/dashboard?settings=:section` |
| `news=1` | The release notes, a drawer (registered, `components/changelog/`) | The navbar's Nouveautés | `/changelog` to `/dashboard?news=1` |
| `request=1` | A new help request, a dialog (registered, `(app)/support/_components/new-request-dialog.tsx`) | "Nouvelle demande" on `/support` and under a finished ticket, "Contact" in the app's footer, "Signaler le problème" on the app's error page (`request=incident-<digest>`: a bug whose subject is `Incident <digest>`, as the public form writes it) and "Être prévenu" on `/download` for a member (`request=android`: a suggestion about the Android app). Any other value opens it empty (`new-request-query.ts`) | none: the public `/contact` stays, for visitors |
| `rappel=1` | The day's recall, a dialog (registered, `components/rappel/rappel-dialog.tsx`): one question at a time, each answer checked on the server, the verdict, the explanation and "Revoir ce passage", the end with its XP | The navbar's "Révisions du jour" (beside the bell), the dashboard's "Rappel du jour" card, the daily reminder (`/dashboard?rappel=1`) | `/revisions` and `/review` to `/dashboard?rappel=1`: the old lesson-level queue (SM-2) is retired |
| `rappel=module-<n>-<path>` | "Réviser ce module", the same dialog: six questions of the module's finished lessons, without XP | "Réviser ce module · 2 min" in a module's header on `/paths/<slug>` | none |
| `compose=1` | A new forum thread, a dialog drawn by its section page (`(app)/forum/_components/new-topic-dialog.tsx`) | "Nouveau sujet" on `/forum/<section>` | `/forum/:category/nouveau` to `/forum/:category?compose=1` |
| `duel=<friend id>` or `duel=1` | Challenge a friend to a duel, a dialog (registered, `(app)/duels/_components/challenge-dialog.tsx`): the friends as cards, the one asked for picked | "Défier un ami" on `/duels`, "Rejouer" and "Relancer un duel" on a duel (in place), "Défier en duel" on a friend's profile (a link to `/duels?duel=<id>`) | `/duels?ami=<id>` to `/duels?duel=<id>`, by the page (`(app)/duels/page.tsx`) |
| `mock=1` | A path's mock exam presented, a dialog drawn by the path's page (`(app)/paths/[slug]/_components/mock-exam-dialog.tsx`); "Commencer" leads to the exam's page with `?go=1` | "Examen blanc" on `/paths/<slug>` | `/paths/:slug/mock-exam` without `go` to `/paths/:slug?mock=1`: the exam keeps its page, which only a started exam reaches. A page load only: the exam takes `go` off the address once started, and its server actions (`Next-Action`) and refreshes (`RSC`) go to that address unredirected. The page brought back by Back or Forward, which no redirect sees, sends itself to the window |

The settings drawer is registered under `settings` with a difference: it keeps
its own state, so its entry hands the request to the drawer and takes the
parameter off the address at once. Opening it from a link does not touch the
address.

## Adding a window

1. Write the window as a client component that takes `QueryDialogProps`
   (`{ value, onClose }`) and draws itself with `ModalShell` or `SideDrawer`,
   open. It is a default export.
2. Register it, lazy, so its code loads only when it is asked for:

   ```ts
   export const QUERY_DIALOGS = {
     [SETTINGS_QUERY]: SettingsFromAddress,
     [NEWS_QUERY]: lazy(() => import("./changelog/news-drawer")),
   };
   ```

3. Open it from a client component with the hook:

   ```tsx
   const news = useQueryDialog(NEWS_QUERY);
   <button type="button" onClick={() => news.open()}>Nouveautés</button>
   ```

   A `<Link href="/dashboard?news=1">` opens it too, from a server component
   or another page, at the cost of a navigation.
4. If the window replaces a page, redirect the old address (see above) and
   delete the page.
5. Test the window on its own. The host and the hook are covered once, in
   `apps/web/components/__tests__/query-dialog-host.test.tsx`.

A window that belongs to one page only (a composer on one forum category)
does not need the registry: the page's client component calls
`useQueryDialog(key)` and draws the window itself while `value` is not null.
Registered, it would open over every page, where it has nothing to work on.

A window that leads to a page once it is done (the new thread, the new
request) goes there with `router.replace` or `<Link replace>`: the page takes
the place of the window's step of the history, and Back returns to the page
the window was opened over rather than to the window again.

Use short English parameter names, one per window. One window open at a time:
two at once work, but their steps of the history interleave.

The mobile app has native screens: whether the site shows a feature as a
window or as a page changes nothing for it. The feature itself still follows
`docs/MOBILE_PARITY.md`.
