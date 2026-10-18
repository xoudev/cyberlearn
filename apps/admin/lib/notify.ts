import { toast } from "sonner";

/**
 * What a console action hands back, in the shapes the actions actually use:
 * `{ error?: string }`, `{ ok, error }`, and `{ success, error }` for the
 * deletions that predate both. A failure is an error message, or `ok` or
 * `success` set to false without one.
 */
export interface ActionResult {
  ok?: boolean | undefined;
  success?: boolean | undefined;
  error?: string | null | undefined;
}

/** Said when an action failed without saying why. */
export const ACTION_FAILED = "L'action a échoué. Réessaie.";

/** Why the action failed, or null when it went through. */
export function actionError(result: ActionResult, fallback: string = ACTION_FAILED): string | null {
  if (typeof result.error === "string" && result.error.trim() !== "") return result.error;
  if (result.ok === false || result.success === false) return fallback;
  return null;
}

export interface NotifyMessages {
  /** Said when the action went through. Nothing is said when it is left out. */
  success?: string | undefined;
  /**
   * Said when the action failed without a message of its own. False when the
   * caller shows the error itself, next to the field it is about: a field's
   * error stays where the field is, and a toast would only repeat it.
   */
  error?: string | false | undefined;
}

/**
 * Says how a console action went, in a toast, and returns whether it went
 * through.
 *
 * Many row actions of the console used to answer with nothing - a toggle that
 * swallowed its error, a status changed with no word - or with a small popup
 * under the row that a table's overflow could clip. A toast is seen wherever
 * the row was.
 */
export function notifyResult(result: ActionResult, messages: NotifyMessages = {}): boolean {
  const error = actionError(
    result,
    typeof messages.error === "string" ? messages.error : ACTION_FAILED,
  );
  if (error !== null) {
    if (messages.error !== false) toast.error(error);
    return false;
  }
  if (messages.success !== undefined) toast.success(messages.success);
  return true;
}
