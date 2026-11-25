/**
 * Who may write to whom, and when: the rules of the messages, kept free of
 * the database so they are tested alone. The repository reads the facts (the
 * conversation, the friendship, the blocks, the recipient's setting) and the
 * service asks these functions what to do with them.
 *
 * - Friends write to each other at once.
 * - Anybody else sends one message, which waits in the recipient's requests.
 *   The requester writes nothing more until it is accepted, and is not told
 *   whether it was read, nor whether it was declined: a declined request looks
 *   like one still waiting.
 * - The recipient's setting decides whether a stranger may ask at all
 *   (EVERYONE), only friends may write (FRIENDS), or nobody (NOBODY).
 * - A block, either way round, stops everything.
 * - The team writes to anybody, and is answered without accepting anything.
 */

export const MESSAGE_PRIVACIES = ["EVERYONE", "FRIENDS", "NOBODY"] as const;
export type MessagePrivacyValue = (typeof MESSAGE_PRIVACIES)[number];

export const MESSAGE_PRIVACY_LABELS: Record<MessagePrivacyValue, string> = {
  EVERYONE: "Tout le monde",
  FRIENDS: "Mes amis seulement",
  NOBODY: "Personne",
};

export const MESSAGE_PRIVACY_HINTS: Record<MessagePrivacyValue, string> = {
  EVERYONE:
    "Tes amis t'écrivent directement ; les autres t'envoient une demande que tu acceptes ou non.",
  FRIENDS: "Seuls tes amis peuvent t'écrire.",
  NOBODY:
    "Personne ne peut commencer de discussion avec toi. L'équipe CyberLearn peut toujours t'écrire.",
};

/** A message's length, as the column holds it (direct_messages.body). */
export const MESSAGE_BODY_MAX = 1000;

/** How many messages a thread loads at a time. */
export const MESSAGE_PAGE_SIZE = 50;

export type ConversationStatusValue = "REQUESTED" | "ACCEPTED" | "DECLINED";

/** Why a message cannot go out, in the words the composer shows. */
export const MESSAGE_REFUSAL = {
  self: "Tu ne peux pas t'écrire à toi-même.",
  blocked: "Tu ne peux pas écrire à ce compte.",
  nobody: "Ce compte ne reçoit pas de messages.",
  friendsOnly: "Ce compte ne reçoit des messages que de ses amis.",
  pending: "Ta demande attend sa réponse : tu pourras écrire de nouveau quand elle sera acceptée.",
  notFound: "Cette discussion n'existe plus.",
  mustAccept: "Accepte la demande pour répondre.",
} as const;

export type MessageRefusal = keyof typeof MESSAGE_REFUSAL;

/** What happens to a first message between two accounts with no conversation yet. */
export function firstMessageOutcome(facts: {
  self: boolean;
  blocked: boolean;
  friends: boolean;
  recipientPrivacy: MessagePrivacyValue;
}): { ok: true; status: "ACCEPTED" | "REQUESTED" } | { ok: false; refusal: MessageRefusal } {
  if (facts.self) return { ok: false, refusal: "self" };
  if (facts.blocked) return { ok: false, refusal: "blocked" };
  if (facts.recipientPrivacy === "NOBODY") return { ok: false, refusal: "nobody" };
  if (facts.friends) return { ok: true, status: "ACCEPTED" };
  if (facts.recipientPrivacy === "FRIENDS") return { ok: false, refusal: "friendsOnly" };
  return { ok: true, status: "REQUESTED" };
}

/**
 * The status a conversation is read with. Two accounts that have become
 * friends since a request write freely: the friendship accepted it.
 */
export function effectiveStatus(
  status: ConversationStatusValue,
  friends: boolean,
): ConversationStatusValue {
  return friends && status !== "DECLINED" ? "ACCEPTED" : status;
}

/** Whether `senderId` may add a message to an existing direct conversation. */
export function nextMessageOutcome(facts: {
  status: ConversationStatusValue;
  requestedById: string | null;
  senderId: string;
  blocked: boolean;
}): { ok: true } | { ok: false; refusal: MessageRefusal } {
  if (facts.blocked) return { ok: false, refusal: "blocked" };
  if (facts.status === "ACCEPTED") return { ok: true };
  // A request, waiting or declined: the requester has said their piece and is
  // told it waits either way; the recipient answers by accepting first.
  return facts.requestedById === facts.senderId
    ? { ok: false, refusal: "pending" }
    : { ok: false, refusal: "mustAccept" };
}

/** The key that makes a pair's conversation unique, whoever wrote first. */
export function directPairKey(one: string, other: string): string {
  const [low, high] = one < other ? [one, other] : [other, one];
  return `direct:${low}:${high}`;
}

/** The key of a learner's conversation with the team. */
export function teamPairKey(userId: string): string {
  return `team:${userId}`;
}
