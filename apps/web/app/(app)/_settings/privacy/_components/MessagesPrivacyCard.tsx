"use client";

// "use client" justified: the choice saves at once, and a block is lifted in
// place, both with a server action and the toast that says it was done.

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  MESSAGE_PRIVACIES,
  MESSAGE_PRIVACY_HINTS,
  MESSAGE_PRIVACY_LABELS,
  type MessagePrivacyValue,
} from "@cyberlearn/lib/messages/rules";
import { setMessagePrivacyAction, unblockAction } from "@/app/(app)/_actions/message-actions";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { EASE, S, SANS } from "../../_components/tokens";

export interface BlockedAccount {
  id: string;
  displayName: string;
  username: string | null;
}

/**
 * Who may start a conversation, and the accounts blocked from the messages
 * panel. The choice is saved when it is made: there is nothing to combine it
 * with, and a save bar for one radio group is a step nobody needs.
 */
export function MessagesPrivacyCard({
  initialPrivacy,
  initialBlocked,
}: {
  initialPrivacy: MessagePrivacyValue;
  initialBlocked: readonly BlockedAccount[];
}): React.JSX.Element {
  const [privacy, setPrivacy] = useState<MessagePrivacyValue>(initialPrivacy);
  const [blocked, setBlocked] = useState<readonly BlockedAccount[]>(initialBlocked);
  const [pending, startTransition] = useTransition();

  const choose = (value: MessagePrivacyValue): void => {
    if (value === privacy) return;
    const previous = privacy;
    setPrivacy(value);
    startTransition(async () => {
      const res = await setMessagePrivacyAction(value);
      if (res.ok) {
        toast.success("Réglage des messages enregistré.");
      } else {
        setPrivacy(previous);
        toast.error(res.error);
      }
    });
  };

  const unblock = (account: BlockedAccount): void => {
    startTransition(async () => {
      const res = await unblockAction(account.id);
      if (res.ok) {
        setBlocked((list) => list.filter((a) => a.id !== account.id));
        const name =
          account.displayName.trim() !== ""
            ? account.displayName
            : (account.username ?? "Ce compte");
        toast.success(`${name} est débloqué.`);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <SettingsCard
        title="Qui peut m'écrire"
        desc="Les messages privés, depuis le bouton en bas à droite. L'équipe CyberLearn peut toujours t'écrire."
      >
        <div role="radiogroup" aria-label="Qui peut m'écrire" style={{ display: "grid", gap: 8 }}>
          {MESSAGE_PRIVACIES.map((value) => {
            const selected = privacy === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={pending}
                onClick={() => {
                  choose(value);
                }}
                style={{
                  textAlign: "left",
                  background: selected ? S.chalk : S.base,
                  border: `1px solid ${selected ? S.chalk : S.borderStrong}`,
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
                }}
              >
                <span
                  style={{
                    fontFamily: SANS,
                    fontWeight: 600,
                    fontSize: 15,
                    color: selected ? S.ink : S.fg,
                  }}
                >
                  {MESSAGE_PRIVACY_LABELS[value]}
                </span>
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: selected ? "#55524d" : S.fg2,
                  }}
                >
                  {MESSAGE_PRIVACY_HINTS[value]}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Comptes bloqués"
        desc="Un compte bloqué ne peut plus t'écrire, et tu ne peux plus lui écrire. Il n'en est pas prévenu."
      >
        {blocked.length === 0 ? (
          <p style={{ fontFamily: SANS, fontSize: 14, color: S.fg2, margin: 0 }}>
            Tu n&apos;as bloqué personne.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {blocked.map((account) => (
              <li
                key={account.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  border: `1px solid ${S.borderStrong}`,
                  padding: "10px 14px",
                  fontFamily: SANS,
                  fontSize: 14,
                }}
              >
                <span>
                  {account.displayName || account.username}
                  {account.username !== null && (
                    <span style={{ color: S.fg2, marginLeft: 6 }}>@{account.username}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="settings-button settings-button--secondary"
                  disabled={pending}
                  onClick={() => {
                    unblock(account);
                  }}
                >
                  Débloquer
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </>
  );
}
