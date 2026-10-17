import { lazy } from "react";
import type React from "react";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import { SettingsFromAddress } from "@/app/(app)/_settings/_components/SettingsDrawer";
import { SETTINGS_QUERY } from "@/app/(app)/_settings/_components/sections";
import { DUEL_QUERY } from "@/app/(app)/duels/_components/duel-query";
import { NEW_REQUEST_QUERY } from "@/app/(app)/support/_components/new-request-query";
import { NEWS_QUERY } from "./changelog/news-query";

/**
 * The windows any page of the signed-in site opens from its address, by the
 * parameter that opens them: QueryDialogHost, mounted once in the (app)
 * layout, draws the one the address names, and the hook useQueryDialog(key)
 * opens and closes it from anywhere.
 *
 * A window is added with one entry, loaded only once it is asked for:
 *
 *   [NEWS_QUERY]: lazy(() => import("./changelog/news-drawer")),
 *
 * The component receives the parameter's value and onClose (QueryDialogProps)
 * and draws itself on ModalShell or SideDrawer from @cyberlearn/ui. See
 * docs/dev/dialogs.md for what should be a window rather than a page.
 */
export const QUERY_DIALOGS: Readonly<Record<string, React.ComponentType<QueryDialogProps>>> = {
  // The settings drawer is always loaded (its provider listens for links to
  // it) and keeps its own state: this entry only hands it the request, so it
  // is not lazy.
  [SETTINGS_QUERY]: SettingsFromAddress,
  // The release notes, from the navbar's Nouveautés (/changelog redirects here).
  [NEWS_QUERY]: lazy(() => import("./changelog/news-drawer")),
  // A help request, filed without leaving the site for the public contact page.
  [NEW_REQUEST_QUERY]: lazy(() => import("@/app/(app)/support/_components/new-request-dialog")),
  // Challenge a friend to a duel, from /duels, a finished duel's rematch or a
  // friend's profile (/duels?ami=<id> lands on it).
  [DUEL_QUERY]: lazy(() => import("@/app/(app)/duels/_components/challenge-dialog")),
};
