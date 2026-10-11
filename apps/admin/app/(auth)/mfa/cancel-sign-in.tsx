"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";

/**
 * "Annuler et se déconnecter", on both TOTP screens. Without it an admin who
 * signed in with the wrong account, or without their phone at hand, had no
 * way back to the sign-in form short of clearing the site's cookies.
 */
export function CancelSignIn(): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function cancel(): Promise<void> {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="a-auth-cancel"
      type="button"
      disabled={pending}
      onClick={() => {
        void cancel();
      }}
    >
      Annuler et se déconnecter
    </button>
  );
}
