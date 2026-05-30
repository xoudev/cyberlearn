import { redirect } from "next/navigation";

// Profile editing now lives in the settings area; keep the old URL working.
export default function ProfileEditRedirect(): never {
  redirect("/settings/profile");
}
