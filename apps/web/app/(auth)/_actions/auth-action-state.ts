export interface AuthActionState {
  status: "idle" | "error" | "success" | "check_email";
  message: string | null;
  redirectTo: string | null;
}

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: null,
  redirectTo: null,
};
