export interface AuthActionState {
  /**
   * `unconfirmed`: the password matched an address nobody has confirmed yet.
   * Kept apart from `error` so the form can offer a new confirmation mail.
   *
   * `recovery_expired`: the reset form was sent after the recovery window
   * closed. Kept apart from `error` so the form can offer a new link instead
   * of asking for the current password it has no field for.
   */
  status: "idle" | "error" | "success" | "check_email" | "unconfirmed" | "recovery_expired";
  message: string | null;
  redirectTo: string | null;
  /**
   * The address typed, handed back. React resets an uncontrolled form once its
   * action has run, so the field no longer holds it: the form puts it back
   * after a refusal, and a confirmation mail can be sent again to it.
   */
  email?: string;
}

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: null,
  redirectTo: null,
};
