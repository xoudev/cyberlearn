"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getRequestUser } from "@/lib/auth";
import { acknowledgeBan, appealBan, type AppealState } from "@/lib/moderation/ban-appeal";

/**
 * The site's entry points for what a banned account can still do (see
 * @/lib/moderation/ban-appeal). Neither goes through requireRequestUser, which
 * would bounce them back here.
 */

export type { AppealState };

/** Closing the notice. Shown once, not on every page they land on. */
export async function acknowledgeBanAction(): Promise<{ ok: boolean }> {
  const user = await getRequestUser();
  if (!user) return { ok: false };

  const result = await acknowledgeBan(user.id);
  if (result.ok) revalidatePath("/banned");
  return result;
}

export async function appealBanAction(
  _prev: AppealState,
  formData: FormData,
): Promise<AppealState> {
  const user = await getRequestUser();
  if (!user) return { error: "Session expirée. Reconnecte-toi." };

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await appealBan({
    userId: user.id,
    fallbackEmail: user.email ?? null,
    message: formData.get("message"),
    ip,
  });
  if (result.ok) revalidatePath("/banned");
  return result;
}
