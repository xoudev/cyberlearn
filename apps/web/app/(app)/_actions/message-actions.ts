"use server";

import { requireRequestUser } from "@/lib/auth";
import {
  answerRequestFor,
  blockFor,
  conversationWith,
  inboxFor,
  recipientsFor,
  reportMessageFor,
  sendMessageFor,
  setMessagePrivacyFor,
  threadFor,
  unblockFor,
} from "@/lib/messages/messages";

/**
 * The messages panel's entry points: the session, then the service
 * (@/lib/messages/messages), which validates every input with Zod and applies
 * the rules. Nothing here trusts an id it is handed: the service only reaches
 * conversations the session's account is a side of.
 */

export async function getInboxAction(): Promise<Awaited<ReturnType<typeof inboxFor>>> {
  const user = await requireRequestUser();
  return inboxFor(user.id);
}

export async function getThreadAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof threadFor>>> {
  const user = await requireRequestUser();
  return threadFor(user.id, input);
}

export async function sendMessageAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof sendMessageFor>>> {
  const user = await requireRequestUser();
  return sendMessageFor(user.id, input);
}

export async function answerRequestAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof answerRequestFor>>> {
  const user = await requireRequestUser();
  return answerRequestFor(user.id, input);
}

export async function blockConversationAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof blockFor>>> {
  const user = await requireRequestUser();
  return blockFor(user.id, input);
}

export async function unblockAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof unblockFor>>> {
  const user = await requireRequestUser();
  return unblockFor(user.id, input);
}

export async function reportMessageAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof reportMessageFor>>> {
  const user = await requireRequestUser();
  return reportMessageFor(user.id, input);
}

export async function setMessagePrivacyAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof setMessagePrivacyFor>>> {
  const user = await requireRequestUser();
  return setMessagePrivacyFor(user.id, input);
}

export async function searchRecipientsAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof recipientsFor>>> {
  const user = await requireRequestUser();
  return recipientsFor(user.id, input);
}

export async function conversationWithAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof conversationWith>>> {
  const user = await requireRequestUser();
  return conversationWith(user.id, input);
}
