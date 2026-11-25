/** The headers of the inbox and of a conversation, shared by the pages and their skeletons. */

export const MESSAGES_HEADER = {
  crumbs: [{ label: "Support" }, { label: "Messages" }],
  title: "Messages",
  description:
    "Les conversations des apprenants avec l'équipe CyberLearn. On écrit à un compte depuis sa page (« Écrire à ce compte »), et ses réponses arrivent ici.",
} as const;

export const CONVERSATION_CRUMBS = [
  { label: "Support" },
  { label: "Messages", href: "/messages" },
  { label: "Conversation" },
] as const;
