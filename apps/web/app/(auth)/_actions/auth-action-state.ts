export interface AuthActionState {
  /**
   * `unconfirmed`: the password matched an address nobody has confirmed yet.
   * Kept apart from `error` so the form can offer a new confirmation mail.
   */
  status: "idle" | "error" | "success" | "check_email" | "unconfirmed";
  message: string | null;
  redirectTo: string | null;
  /**
   * The address a confirmation mail can be sent again to. React resets an
   * uncontrolled form once its action has run, so the field no longer holds it.
   */
  email?: string;
}

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: null,
  redirectTo: null,
};
