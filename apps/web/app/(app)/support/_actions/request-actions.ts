"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireRequestUser } from "@/lib/auth";
import { fileAccountTicket, type FileTicketResult } from "@/lib/tickets/requester";

/**
 * The site's entry point for a new help request from a signed-in account, the
 * "Nouvelle demande" window: the session (requireRequestUser, which also turns
 * a banned account away), then the service the contact form and the app use
 * too, with the same validation and the same rate limit. The answer goes to
 * the account's own address, read on the server rather than typed in the form.
 *
 * No honeypot or time trap, unlike the public contact form: they are there for
 * visitors nobody knows, and a signed-in account is already the gate, as in
 * the app. They also answer a bot with a silent success, which here would
 * confirm a request that never reaches the list.
 */

export type { FileTicketResult };

export async function fileRequestAction(input: {
  subject: string;
  theme: string;
  message: string;
}): Promise<FileTicketResult> {
  const user = await requireRequestUser();
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // The input goes on as it came: the service reads the request's three fields
  // from it, validated, and nothing else.
  const result = await fileAccountTicket({
    user: { id: user.id, email: user.email ?? null },
    ip,
    fields: input,
  });
  // The new request takes its place at the top of "Mes demandes".
  if (result.ok) revalidatePath("/support");
  return result;
}
