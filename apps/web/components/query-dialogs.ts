import type React from "react";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import { SettingsFromAddress } from "@/app/(app)/_settings/_components/SettingsDrawer";
import { SETTINGS_QUERY } from "@/app/(app)/_settings/_components/sections";

/**
 * The windows any page of the signed-in site opens from its address, by the
 * parameter that opens them: QueryDialogHost, mounted once in the (app)
 * layout, draws the one the address names, and the hook useQueryDialog(key)
 * opens and closes it from anywhere.
 *
 * A window is added with one entry, loaded only once it is asked for:
 *
 *   news: lazy(() => import("@/app/(app)/changelog/_components/news-drawer")),
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
};
