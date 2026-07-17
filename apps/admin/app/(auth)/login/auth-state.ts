// Plain module: "use server" files may only export async functions, so the
// action state shape and its initial value live here (mirrors the web app).
export interface AdminAuthState {
  status: "idle" | "error" | "success";
  message: string | null;
  redirectTo: string | null;
}

export const initialAdminAuthState: AdminAuthState = {
  status: "idle",
  message: null,
  redirectTo: null,
};
