import React from "react";
import type { Metadata } from "next";
import { friendshipRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { FriendRow, type FriendListKind } from "./_components/friend-rows";
import "./friends.css";

export const metadata: Metadata = { title: "Amis" };

/**
 * Three lists, in the order they need answering.
 *
 * Requests waiting on you come first, because they are the only part of this
 * page that is somebody else waiting. Then the friends, then what you have sent
 * and nobody has answered - which is the least urgent thing here and reads as
 * clutter anywhere above.
 */
export default async function FriendsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const [friends, incoming, outgoing] = await Promise.all([
    friendshipRepository.listFriends(user.id),
    friendshipRepository.listIncoming(user.id),
    friendshipRepository.listOutgoing(user.id),
  ]);

  const sections: { kind: FriendListKind; title: string; empty: string; edges: typeof friends }[] =
    [
      {
        kind: "incoming",
        title: `Demandes reçues · ${String(incoming.length)}`,
        empty: "",
        edges: incoming,
      },
      {
        kind: "friends",
        title: `Amis · ${String(friends.length)}`,
        empty:
          "// personne pour l'instant : ouvre le profil de quelqu'un et ajoute-le depuis sa page",
        edges: friends,
      },
      {
        kind: "outgoing",
        title: `Demandes envoyées · ${String(outgoing.length)}`,
        empty: "",
        edges: outgoing,
      },
    ];

  return (
    <div className="page-container fr-page">
      <header className="fr-head">
        <p className="fr-eyebrow">
          <span aria-hidden="true">{"//"}</span> Relations
        </p>
        <h1 className="fr-title">Tes amis.</h1>
        <p className="fr-lede">
          Ajoute quelqu&apos;un depuis son profil. Une demande reste en attente jusqu&apos;à ce
          qu&apos;elle soit acceptée, et peut être annulée à tout moment.
        </p>
      </header>

      {sections.map((section) => {
        // An empty "requests sent" heading is a heading about nothing. The
        // friends list keeps its heading even when empty, because that one is
        // the page.
        if (section.edges.length === 0 && section.empty === "") return null;

        return (
          <section key={section.kind} className="fr-section">
            <h2 className="fr-section-title">{section.title}</h2>
            {section.edges.length === 0 ? (
              <p className="fr-empty">{section.empty}</p>
            ) : (
              <ul className="fr-list">
                {section.edges.map((edge) => (
                  <FriendRow key={edge.id} edge={edge} kind={section.kind} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
