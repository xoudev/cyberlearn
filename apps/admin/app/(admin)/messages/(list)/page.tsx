import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { messageRepository } from "@cyberlearn/db";
import { Card, EmptyState, PageHeader, Tag } from "../../_components/admin-ui";
import { MESSAGES_HEADER } from "../_components/headers";
import { requireAdminPage } from "@/lib/auth";
import { consoleDateFormat } from "@/lib/console-time";

export const metadata: Metadata = { title: "Messages" };

const PAGE_SIZE = 50;

function stamp(date: Date): string {
  return consoleDateFormat({ dateStyle: "short", timeStyle: "short" }).format(date);
}

/**
 * The learners' conversations with the team, newest first. A conversation
 * whose last message is the learner's, after the team last read it, waits for
 * the team: it is marked, and counted in the sidebar.
 *
 * Only these conversations: two learners' messages are theirs, and reach the
 * console only through a report (Signalements).
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const { total, rows } = await messageRepository.teamInbox({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={MESSAGES_HEADER.crumbs}
        title={MESSAGES_HEADER.title}
        description={MESSAGES_HEADER.description}
      />
      <div className="a-stack">
        <Card title={`Conversations · ${String(total)}`}>
          {rows.length === 0 ? (
            <EmptyState
              title="Aucune conversation"
              text="Écris à un compte depuis sa page dans Utilisateurs : la conversation apparaîtra ici."
            />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rows.map((row) => {
                const name =
                  row.learner.displayName.trim() !== ""
                    ? row.learner.displayName
                    : (row.learner.username ?? row.learner.email);
                const last = row.lastMessage;
                return (
                  <li key={row.id} style={{ borderTop: "1px solid var(--a-border)" }}>
                    <Link
                      href={`/messages/${row.id}`}
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                        padding: "14px 18px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: row.unread ? 700 : 500 }}>
                          {name}
                          {row.learner.username !== null && (
                            <span className="a-field-hint" style={{ marginLeft: 8 }}>
                              @{row.learner.username}
                            </span>
                          )}
                        </span>
                        <span
                          className="a-field-hint"
                          style={{
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {last === null ? "" : `${last.fromTeam ? "Équipe : " : ""}${last.body}`}
                        </span>
                      </span>
                      {row.unread && <Tag tone="warning">À lire</Tag>}
                      <span className="mono a-field-hint">{stamp(row.lastMessageAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        {pages > 1 && (
          <nav className="a-row-actions" aria-label="Pages">
            {page > 1 && (
              <Link className="a-btn a-btn--ghost" href={`/messages?page=${String(page - 1)}`}>
                Précédente
              </Link>
            )}
            <span className="a-field-hint">
              Page {page} sur {pages}
            </span>
            {page < pages && (
              <Link className="a-btn a-btn--ghost" href={`/messages?page=${String(page + 1)}`}>
                Suivante
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
