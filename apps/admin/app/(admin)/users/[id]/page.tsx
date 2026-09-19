import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import {
  Card,
  GhostLink,
  KpiCard,
  Monogram,
  PageHeader,
  Tag,
  UI,
} from "../../_components/admin-ui";
import { ROLE_LABEL, roleTone } from "@/lib/roles";
import { banRepository } from "@cyberlearn/db";
import { banTimeLeft } from "@cyberlearn/lib";
import { BanForm } from "./_components/ban-form";
import { DeleteUserForm } from "./_components/delete-user-form";
import { ResetProgressForm } from "./_components/reset-progress-form";

export const metadata: Metadata = { title: "Compte" };
export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(d);
}

/**
 * One account, and the two things you can do to it.
 *
 * Deletion lives here rather than on the list. A destructive action belongs
 * behind a navigation: a misclick in a sorted table is cheap and this one is
 * not undoable, and a page has the room to say what is about to be erased -
 * which a row does not.
 */
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      level: true,
      xpTotal: true,
      streakDays: true,
      createdAt: true,
      lastActiveAt: true,
      _count: {
        select: {
          badges: true,
          certificates: { where: { revokedAt: null } },
          questions: true,
          answers: true,
        },
      },
      classMemberships: {
        select: {
          class: {
            select: {
              id: true,
              name: true,
              promotion: { select: { name: true, establishment: { select: { name: true } } } },
            },
          },
        },
      },
      taughtClasses: {
        select: {
          subject: true,
          class: {
            select: {
              id: true,
              name: true,
              promotion: { select: { name: true, establishment: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) notFound();

  // The ban in force and the ones before it. The history is the point as much
  // as the state: the second ban on an account is not the first one, and
  // whoever is deciding what to do needs to see both.
  const [active, history] = await Promise.all([
    banRepository.findActive(user.id),
    banRepository.history(user.id),
  ]);

  const stamp = (date: Date): string =>
    new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(date);

  const activeBan = active
    ? {
        reason: active.reason,
        endsLabel: banTimeLeft(active.expiresAt),
        issuedOn: stamp(active.createdAt),
        issuedBy: active.issuedBy?.displayName ?? null,
        hasAppeal: active.appealTicketId !== null,
      }
    : null;

  const banHistory = history
    .filter((ban) => ban.id !== active?.id)
    .map((ban) => ({
      id: ban.id,
      reason: ban.reason,
      issuedOn: stamp(ban.createdAt),
      outcome:
        ban.liftedAt !== null
          ? `Levé le ${stamp(ban.liftedAt)}`
          : ban.expiresAt === null
            ? "Définitif"
            : `Expiré le ${stamp(ban.expiresAt)}`,
    }));

  const handle = user.username ? `@${user.username}` : user.displayName || user.email;

  return (
    <main className="a-page">
      <PageHeader
        eyebrow={ROLE_LABEL[user.role]}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <Monogram text={handle.replace("@", "")} size={32} tone={roleTone(user.role)} />
            {handle}
          </span>
        }
        description={user.email}
        actions={<GhostLink href="/users">Retour aux comptes</GhostLink>}
      />

      <div className="a-kpi-grid">
        <KpiCard label="Niveau" value={String(user.level)} tone="accent" />
        <KpiCard label="XP" value={user.xpTotal.toLocaleString("fr-FR")} tone="info" />
        <KpiCard label="Série" value={`${String(user.streakDays)} j`} tone="warning" />
        <KpiCard label="Badges" value={String(user._count.badges)} tone="purple" />
      </div>

      <Card title="Compte" pad>
        <div className="a-defrow">
          {/* Read-only here. Changing a role is something you do while
              scanning a list of people, which is where that control lives;
              this page is for looking at one account and, at the bottom,
              removing it. */}
          <span className="a-defrow-label">Rôle</span>
          <Tag tone={roleTone(user.role)}>{ROLE_LABEL[user.role]}</Tag>
        </div>
        <div className="a-defrow">
          <span className="a-defrow-label">Inscrit</span>
          <span className="mono a-field-hint">{formatDate(user.createdAt)}</span>
        </div>
        <div className="a-defrow">
          <span className="a-defrow-label">Dernière activité</span>
          <span className="mono a-field-hint">{formatDate(user.lastActiveAt)}</span>
        </div>
        <div className="a-defrow">
          <span className="a-defrow-label">Attestations actives</span>
          <span className="mono a-field-hint">{user._count.certificates}</span>
        </div>
        <div className="a-defrow">
          <span className="a-defrow-label">Questions et réponses publiées</span>
          {/* Named here because they are the one thing a deletion does not
              erase - it detaches them. Better read before the button than
              discovered after it. */}
          <span className="mono a-field-hint">{user._count.questions + user._count.answers}</span>
        </div>
      </Card>

      <Card title={`Classes · ${String(user.classMemberships.length + user.taughtClasses.length)}`}>
        {user.classMemberships.length + user.taughtClasses.length === 0 ? (
          <div className="a-card-pad">
            <p className="a-field-hint">Ce compte n&apos;est rattaché à aucune classe.</p>
          </div>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {user.taughtClasses.map((t) => (
                  <tr key={`t-${t.class.id}`}>
                    <td>
                      <Link href={`/classes/${t.class.id}`} className="a-row-link">
                        <span className="a-row-link-title">{t.class.name}</span>
                      </Link>
                    </td>
                    <td style={{ color: UI.muted }}>
                      {t.class.promotion.establishment.name} · {t.class.promotion.name}
                    </td>
                    <td align="right">
                      <Tag tone="info">Professeur{t.subject !== null ? ` · ${t.subject}` : ""}</Tag>
                    </td>
                  </tr>
                ))}
                {user.classMemberships.map((m) => (
                  <tr key={`m-${m.class.id}`}>
                    <td>
                      <Link href={`/classes/${m.class.id}`} className="a-row-link">
                        <span className="a-row-link-title">{m.class.name}</span>
                      </Link>
                    </td>
                    <td style={{ color: UI.muted }}>
                      {m.class.promotion.establishment.name} · {m.class.promotion.name}
                    </td>
                    <td align="right">
                      <Tag tone="neutral">Élève</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BanForm userId={user.id} active={activeBan} history={banHistory} />

      {/* Before the deletion, and with its own confirmation token: the one
          that keeps the account is the one to reach for first. */}
      <ResetProgressForm
        userId={user.id}
        handle={user.username ?? user.email}
        displayName={user.displayName || handle}
      />

      <DeleteUserForm
        userId={user.id}
        email={user.email}
        displayName={user.displayName || handle}
      />
    </main>
  );
}
