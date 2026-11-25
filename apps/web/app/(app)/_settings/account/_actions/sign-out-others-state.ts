/**
 * What "Fermer mes autres sessions" answers, and what its panel starts from.
 * Apart from the action: a "use server" module may only export async
 * functions.
 */
export interface SignOutOthersState {
  status: "idle" | "done" | "error";
  message: string | null;
}

export const SIGN_OUT_OTHERS_IDLE: SignOutOthersState = { status: "idle", message: null };
