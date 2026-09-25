"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { replyAsRequester } from "@/lib/tickets/requester";

/**
 * The site's entry point for the requester's reply: the session, then the
 * service the app uses too (@/lib/tickets/requester).
 */

export interface ReplyState {
  error?: string;
  ok?: boolean;
}

export async function replyToTicketAction(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const user = await requireRequestUser();
  const input = Object.fromEntries(formData.entries());
  const result = await replyAsRequester(user.id, input);
  if (!result.ok) return { error: result.error };

  const ticketId = typeof input.ticketId === "string" ? input.ticketId : "";
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  return { ok: true };
}
