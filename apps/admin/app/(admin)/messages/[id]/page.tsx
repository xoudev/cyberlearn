import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { banRepository, messageRepository } from "@cyberlearn/db";
import { Card, GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { MessageForm } from "../../users/[id]/_components/message-form";
import { CONVERSATION_CRUMBS } from "../_components/headers";
import { requireAdminPage } from "@/lib/auth";
import { consoleDateFormat } from "@/lib/console-time";
import { routeIdOrNotFound } from "@/lib/route-id";

export const metadata: Metadata = { title: "Conversation" };

function stamp(date: Date): string {
  return consoleDateFormat({ dateStyle: "short", timeStyle: "short" }).format(date);
}

/**
 * One learner's conversation with the team, whole, and the form to answer.
 * Opening it marks the learner's replies read by the team. Each message from
 * the team names the administrator who wrote it, here only: the learner reads
 * « Équipe CyberLearn ».
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);
  const conversation = await messageRepository.teamThread(id);
  if (conversation === null) notFound();
  const learner = conversation.userA;
  const [ban] = await Promise.all([
    banRepository.findActive(learner.id),
    messageRepository.markTeamRead(id),
  ]);
  const name =
    learner.displayName.trim() !== "" ? learner.displayName : (learner.username ?? learner.email);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={CONVERSATION_CRUMBS}
        title={name}
        description={
          learner.username !== null ? `@${learner.username} · ${learner.email}` : learner.email
        }
        actions={<GhostLink href={`/users/${learner.id}`}>Voir le compte</GhostLink>}
      />
      <div className="a-stack">
        <Card title={`Messages · ${String(conversation.messages.length)}`} pad>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {conversation.messages.map((m) => (
              <li
                key={m.id}
                style={{
                  justifySelf: m.fromTeam ? "end" : "start",
                  maxWidth: "80%",
                  border: "1px solid var(--a-border)",
                  background: m.fromTeam ? "var(--a-overlay)" : "transparent",
                  padding: "10px 12px",
                }}
              >
                <div className="a-field-hint" style={{ marginBottom: 4 }}>
                  {m.fromTeam ? `Équipe · ${m.sender?.displayName ?? "compte supprimé"}` : name} ·{" "}
                  <span className="mono">{stamp(m.createdAt)}</span>
                  {m.isHidden && (
                    <span style={{ marginLeft: 8 }}>
                      <Tag tone="danger">Retiré</Tag>
                    </span>
                  )}
                </div>
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.55 }}>
                  {m.body}
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <MessageForm
          userId={learner.id}
          name={name}
          banned={ban !== null}
          conversationId={conversation.id}
          title="Répondre"
        />
        <p className="a-field-hint">
          <Link href="/messages">Retour aux messages</Link>
        </p>
      </div>
    </main>
  );
}
