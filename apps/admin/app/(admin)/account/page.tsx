import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { Card, GhostLink, PageHeader, Tag, UserAvatar } from "../_components/admin-ui";
import { ACCOUNT_CARDS, ACCOUNT_HEADER } from "./_components/account-head";
import { OwnSessions } from "./_components/own-sessions";
import { learnerUrl } from "@/lib/learner-url";
import { readSignInState, type SignInState } from "@/lib/sign-in-state";

import { requireAdminPage } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar";

export const metadata: Metadata = { title: "Mon compte" };

const dated = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "long",
  timeStyle: "short",
});

/** How Supabase names a sign-in method. */
const PROVIDER_LABEL: Record<string, string> = {
  email: "Mot de passe",
  github: "GitHub",
};

/** Where the password is changed: the site's own settings, or null when the console cannot point there. */
function passwordHref(): string | null {
  try {
    return learnerUrl("/settings/account");
  } catch {
    return null;
  }
}

function DefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="a-defrow">
      <span className="a-defrow-label">{label}</span>
      {children}
    </div>
  );
}

function SignIn({ state }: { state: SignInState }): React.ReactElement {
  if (state.status !== "ok") {
    return (
      <p className="a-form-error">
        {state.status === "missing"
          ? "Aucun identifiant de connexion n'est rattaché à ce compte."
          : "Supabase n'a pas répondu : l'état de connexion n'a pas pu être lu. Recharge la page dans un instant."}
      </p>
    );
  }
  return (
    <>
      <DefRow label="Double authentification">
        {state.verifiedTotp > 0 ? (
          <Tag tone="accent">
            Active · {String(state.verifiedTotp)} facteur{state.verifiedTotp > 1 ? "s" : ""}
          </Tag>
        ) : (
          // Unreachable in practice: the console asks for the factor before any page.
          <Tag tone="danger">Inactive</Tag>
        )}
      </DefRow>
      {state.pendingTotp > 0 && (
        <DefRow label="Activations inachevées">
          <span className="mono a-field-hint">{String(state.pendingTotp)}</span>
        </DefRow>
      )}
      <DefRow label="Méthodes de connexion">
        <span className="mono a-field-hint">
          {state.providers.length > 0
            ? state.providers.map((provider) => PROVIDER_LABEL[provider] ?? provider).join(" · ")
            : "Aucune"}
        </span>
      </DefRow>
      <DefRow label="Dernière connexion">
        <span className="mono a-field-hint">
          {state.lastSignInAt !== null ? dated.format(state.lastSignInAt) : "Jamais"}
        </span>
      </DefRow>
    </>
  );
}

/**
 * « Mon compte »: the administrator's own account. Who the console knows them
 * as, their second factor, what they did (the audit log under their id), and
 * their sessions. The password is changed on the site, where it lives.
 */
export default async function AccountPage(): Promise<React.ReactElement> {
  const admin = await requireAdminPage();
  const [account, signIn] = await Promise.all([
    userRepository.findOwnConsoleAccount(admin.id),
    readSignInState(admin.id),
  ]);
  if (account === null) notFound();
  const password = passwordHref();
  const avatarSrc = await resolveAvatarSrc(account.avatarUrl);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={ACCOUNT_HEADER.crumbs}
        title={ACCOUNT_HEADER.title}
        description={ACCOUNT_HEADER.description}
      />

      <div className="admin-settings-grid">
        <Card title={ACCOUNT_CARDS.identity}>
          <DefRow label="Avatar">
            <UserAvatar
              src={avatarSrc}
              name={account.displayName || (account.username ?? account.email)}
              size={48}
            />
          </DefRow>
          <DefRow label="Adresse e-mail">
            <span className="mono a-field-hint">{account.email}</span>
          </DefRow>
          <DefRow label="Pseudo">
            <span className="mono a-field-hint">
              {account.username !== null ? `@${account.username}` : "Aucun"}
            </span>
          </DefRow>
          <DefRow label="Nom affiché">
            <span className="a-field-hint">{account.displayName}</span>
          </DefRow>
          <DefRow label="Rôle">
            <Tag tone="accent">{account.role === "ADMIN" ? "Administrateur" : account.role}</Tag>
          </DefRow>
          <DefRow label="Compte créé le">
            <span className="mono a-field-hint">{dated.format(account.createdAt)}</span>
          </DefRow>
        </Card>

        <Card
          title={ACCOUNT_CARDS.signIn}
          action={
            password !== null ? (
              <GhostLink href={password}>Changer le mot de passe</GhostLink>
            ) : null
          }
        >
          <SignIn state={signIn} />
        </Card>

        <Card title={ACCOUNT_CARDS.actions} pad>
          <div className="a-stack">
            <p className="a-field-hint" style={{ margin: 0 }}>
              {account._count.auditLogs.toLocaleString("fr-FR")} entrée
              {account._count.auditLogs > 1 ? "s" : ""} de l&apos;audit log à ton nom, sur les douze
              derniers mois que le journal garde.
            </p>
            <div>
              <GhostLink href={`/audit?actor=${account.id}`}>Voir mes actions</GhostLink>
            </div>
          </div>
        </Card>

        <Card title={ACCOUNT_CARDS.sessions} pad>
          <OwnSessions />
        </Card>
      </div>
    </main>
  );
}
