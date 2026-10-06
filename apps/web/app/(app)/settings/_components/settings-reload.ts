import { createContext, useContext } from "react";

/**
 * How a section asks for its data again after changing something only the
 * server knows (an uploaded photo's signed URL, a deletion link's expiry).
 *
 * On a full page there is nothing to do here: the action's revalidation or
 * router.refresh() renders the page again. The drawer received its data in
 * one request when it opened, so it has to ask again; it provides this.
 */
export const SettingsReloadContext = createContext<() => void>(() => undefined);

export function useSettingsReload(): () => void {
  return useContext(SettingsReloadContext);
}
