"use server";

import { requireRequestUser } from "@/lib/auth";
import { deleteWriteup, publishWriteup, type WriteupResult } from "@/lib/challenges/writeups";

/**
 * The site's entry points for a challenge's write-ups: the session, then the
 * service the app uses too (@/lib/challenges/writeups).
 */

export type { WriteupResult };

export async function publishWriteupAction(input: unknown): Promise<WriteupResult> {
  const user = await requireRequestUser();
  return publishWriteup(user.id, input);
}

export async function deleteWriteupAction(challengeId: unknown): Promise<WriteupResult> {
  const user = await requireRequestUser();
  return deleteWriteup(user.id, challengeId);
}
