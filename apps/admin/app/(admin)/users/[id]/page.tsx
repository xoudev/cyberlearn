import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, GhostLink, KpiCard, Monogram, PageHeader, Tag } from "../../_components/admin-ui";
import { ROLE_LABEL, roleTone } from "@/lib/roles";
import {
  auditLogRepository,
  badgeRepository,
  banRepository,
  certificateRepository,
  isTicketOpen,
  lessonProgressRepository,
  moderationRepository,
  noteReportRepository,
  pathRepository,
  placementRepository,
  quizRepository,
  ticketRepository,
  userRepository,
  xpLedgerRepository,
} from "@cyberlearn/db";
import { banTimeLeft } from "@cyberlearn/lib";
import { isUploadedAvatar } from "@cyberlearn/types";
import { mfaResetRefusal, recentAdminSince } from "@/lib/account-guards";
import { consoleDateFormat } from "@/lib/console-time";
import { RECENT_LEDGER_ROWS } from "@/lib/gamification-corrections";
import { routeIdOrNotFound } from "@/lib/route-id";
import { readSignInState, type SignInState } from "@/lib/sign-in-state";
import { avatarLabel } from "@/lib/user-record";
import { AuditPanel } from "./_components/audit-panel";
import { BanForm } from "./_components/ban-form";
import { CertificatesPanel } from "./_components/certificates-panel";
import { DeleteUserForm } from "./_components/delete-user-form";
import { GamificationPanel } from "./_components/gamification-panel";
import { MfaResetForm } from "./_components/mfa-reset-form";
import { ModerationPanel } from "./_components/moderation-panel";
import { PreferencesPanel } from "./_components/preferences-panel";
import { ProfileForm } from "./_components/profile-form";
import { ProgressPanel } from "./_components/progress-panel";
import { ResetProgressForm } from "./_components/reset-progress-form";
import { SignInActions } from "./_components/sign-in-actions";
import { TicketsPanel } from "./_components/tickets-panel";
import { describeBanAppeal } from "../../tickets/appealed-ban";
import { USER_CARDS, USER_CRUMBS, USER_DETAIL_KPI_LABELS } from "../_components/columns";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Compte" };
export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return consoleDateFormat({ dateStyle: "long", timeStyle: "short" }).format(d);
}

/** How Supabase names a sign-in method, and how support says it. */
const PROVIDER_LABEL: Record<string, string> = {
  email: "Mot de passe",
  github: "GitHub",
};

/** Lines of the moderation record, reports and audit log the page shows. */
const RECENT_ROWS = 10;
/** Lessons listed, and offered to the correction form. */
const RECENT_LESSONS = 30;

/**
 * One account, everything support needs to know about it, and what can be
 * done to it.
 *
 * Every read goes through a repository. The gestures that unblock somebody
 * come first: a lost phone or a mail that never arrived is the usual reason
 * to open this page. The record follows in two columns: on the left who the
 * account is and what it learned, with the corrections to each; on the right
 * what it asked, what it was flagged or banned for, and what the audit log
 * says about it. The two gestures that cannot be undone close the page.
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
  const viewer = await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  const user = await userRepository.findConsoleProfile(id);
  if (!user) notFound();

  const now = new Date();
  // The ban in force and the ones before it. The history is the point as much
  // as the state: the second ban on an account is not the first one, and
  // whoever is deciding what to do needs to see both. The role history decides
  // whether the second factor may be reset here, as the action decides it.
  const [
    active,
    history,
    signIn,
    wasRecentlyAdmin,
    tickets,
    moderationEvents,
    moderationTotal,
    noteReports,
    noteReportTotal,
    auditRows,
    paths,
    exams,
    lessons,
    lessonCounts,
    certificates,
    placementResetAt,
    ledger,
    heldBadges,
    activeBadges,
  ] = await Promise.all([
    banRepository.findActive(user.id),
    banRepository.history(user.id),
    readSignInState(user.id),
    userRepository.heldAdminRoleSince(user.id, recentAdminSince(now)),
    ticketRepository.findForUser(user.id),
    moderationRepository.findForUser(user.id, RECENT_ROWS),
    moderationRepository.countForUser(user.id),
    noteReportRepository.againstAuthor(user.id, RECENT_ROWS),
    noteReportRepository.countAgainstAuthor(user.id),
    auditLogRepository.recentForUser(user.id, RECENT_ROWS),
    pathRepository.findProgressForConsole(user.id),
    quizRepository.latestAttemptsForConsole(user.id),
    lessonProgressRepository.recentForConsole(user.id, RECENT_LESSONS),
    lessonProgressRepository.countsForConsole(user.id),
    certificateRepository.findAllForConsole(user.id),
    // Only an account without a result can have been asked to sit it again.
    user.placementResult === null ? placementRepository.lastResetAt(user.id) : null,
    xpLedgerRepository.recentForUser(user.id, RECENT_LEDGER_ROWS),
    badgeRepository.heldForConsole(user.id),
    badgeRepository.findAllActive(),
  ]);

  const stamp = (date: Date): string =>
    consoleDateFormat({ dateStyle: "short", timeStyle: "short" }).format(date);

  // The appeal's ticket is among the account's own: it was opened by the person
  // the ban is on. Its status says whether the appeal still waits for an answer.
  const appealTicketId = active?.appealTicketId ?? null;
  const appealTicket =
    appealTicketId === null ? undefined : tickets.find((ticket) => ticket.id === appealTicketId);
  const activeBan = active
    ? {
        reason: active.reason,
        endsLabel: banTimeLeft(active.expiresAt),
        issuedOn: stamp(active.createdAt),
        issuedBy: active.issuedBy?.displayName ?? null,
        appeal:
          appealTicketId === null
            ? null
            : {
                ticketId: appealTicketId,
                ...describeBanAppeal(
                  appealTicket === undefined
                    ? null
                    : { status: appealTicket.status, open: isTicketOpen(appealTicket.status) },
                ),
              },
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
  const classCount = user.classMemberships.length + user.taughtClasses.length;

  return (
    <main className="a-page">
      <PageHeader
        crumbs={USER_CRUMBS}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <Monogram text={handle.replace("@", "")} size={32} tone={roleTone(user.role)} />
            {handle}
          </span>
        }
        description={user.email}
        actions={
          <>
            {/* What was done to the account, from the console. */}
            <GhostLink href={`/audit?target=${user.id}`}>Journal d&apos;audit</GhostLink>
            {/* The file its holder downloads from the site, for a request made
                to the team. A plain link: the file comes from a route, not a
                page the router could render. No `download` attribute, so a
                refusal (too many exports, an account gone) opens as a page
                that says why rather than as a failed download. */}
            <a href={`/users/${user.id}/export`} className="a-btn a-btn--ghost">
              Exporter les données (RGPD)
            </a>
            <GhostLink href="/users">Retour aux comptes</GhostLink>
          </>
        }
      />

      <div className="a-kpi-grid">
        <KpiCard label={USER_DETAIL_KPI_LABELS[0]} value={String(user.level)} tone="accent" />
        <KpiCard
          label={USER_DETAIL_KPI_LABELS[1]}
          value={user.xpTotal.toLocaleString("fr-FR")}
          tone="info"
        />
        <KpiCard
          label={USER_DETAIL_KPI_LABELS[2]}
          value={`${String(user.streakDays)} j`}
          tone="warning"
        />
        <KpiCard
          label={USER_DETAIL_KPI_LABELS[3]}
          value={String(user._count.badges)}
          tone="purple"
        />
      </div>

      <div className="a-split">
        <div className="a-stack" style={{ alignContent: "start" }}>
          <Card title={USER_CARDS.account} pad>
            <div className="a-defrow">
              {/* Read-only here. Changing a role is something you do while
                  scanning a list of people, which is where that control lives. */}
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
              <span className="a-defrow-label">Questions et réponses publiées</span>
              {/* Named here because they are the one thing a deletion does not
                  erase - it detaches them. Better read before the button than
                  discovered after it. */}
              <span className="mono a-field-hint">
                {user._count.questions + user._count.answers}
              </span>
            </div>
          </Card>

          <SignInCard
            userId={user.id}
            email={user.email}
            state={signIn}
            canRevoke={viewer.id !== user.id}
          />

          {/* Mounted whenever the factors could be read, even when there are
              none: after a reset the page re-renders with zero factors, and
              the form has to stay to say what it did. */}
          {signIn.status === "ok" && (
            <MfaResetForm
              userId={user.id}
              email={user.email}
              displayName={user.displayName || handle}
              factorCount={signIn.verifiedTotp + signIn.pendingTotp}
              refusal={mfaResetRefusal({
                actorId: viewer.id,
                targetId: user.id,
                targetRole: user.role,
                wasRecentlyAdmin,
              })}
            />
          )}

          <ProfileForm
            userId={user.id}
            displayName={user.displayName}
            username={user.username}
            bio={user.bio}
            avatarLabel={avatarLabel(user.avatarUrl)}
            avatarIsUpload={isUploadedAvatar(user.avatarUrl)}
            hasAvatar={user.avatarUrl !== null}
          />

          <ProgressPanel
            userId={user.id}
            placement={user.placementResult}
            placementResetAt={placementResetAt}
            placementWaivers={user._count.skipWaivers}
            paths={paths}
            exams={exams}
            lessons={lessons}
            lessonCounts={lessonCounts}
            now={now}
          />

          {/* The four figures at the top of the page, corrected by hand. */}
          <GamificationPanel
            userId={user.id}
            handle={handle}
            standing={user}
            ledger={ledger}
            held={heldBadges}
            activeBadges={activeBadges}
          />

          <CertificatesPanel certificates={certificates} />
        </div>

        <div className="a-stack" style={{ alignContent: "start" }}>
          <BanForm userId={user.id} active={activeBan} history={banHistory} />

          <TicketsPanel tickets={tickets} />

          <ModerationPanel
            events={moderationEvents}
            eventTotal={moderationTotal}
            noteReports={noteReports}
            noteReportTotal={noteReportTotal}
          />

          <AuditPanel userId={user.id} rows={auditRows} />

          <PreferencesPanel preferences={user.preferences} />

          <Card title={`Classes · ${String(classCount)}`}>
            {classCount === 0 ? (
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
                        <td style={{ color: "var(--a-muted)" }}>
                          {t.class.promotion.establishment.name} · {t.class.promotion.name}
                        </td>
                        <td align="right">
                          <Tag tone="info">
                            Professeur{t.subject !== null ? ` · ${t.subject}` : ""}
                          </Tag>
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
                        <td style={{ color: "var(--a-muted)" }}>
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
        </div>
      </div>

      <div className="a-stack" style={{ marginTop: 18 }}>
        {/* Before the deletion, and with its own confirmation token: the one
            that keeps the account is the one to reach for first. */}
        <ResetProgressForm
          userId={user.id}
          handle={user.username ?? user.email}
          displayName={user.displayName || handle}
        />

        <DeleteUserForm userId={user.id} email={user.email} />
      </div>
    </main>
  );
}

/**
 * Why somebody may be stuck at the door: an address never confirmed, a second
 * factor on a lost phone, a sign-in method they forgot they used. All of it is
 * in Supabase Auth, not in the users table, so it is read there, and the
 * gestures that answer it sit underneath.
 */
function SignInCard({
  userId,
  email,
  state,
  canRevoke,
}: {
  userId: string;
  email: string;
  state: SignInState;
  canRevoke: boolean;
}): React.ReactElement {
  if (state.status === "missing") {
    return (
      <Card title={USER_CARDS.signIn} pad>
        <p className="a-form-notice">
          Aucun identifiant de connexion n&apos;est rattaché à ce compte : il n&apos;a pas été créé
          par l&apos;inscription. Il ne peut pas se connecter, et aucun e-mail ne peut l&apos;y
          aider.
        </p>
      </Card>
    );
  }
  if (state.status === "unavailable") {
    return (
      <Card title={USER_CARDS.signIn} pad>
        <p className="a-form-error">
          Supabase n&apos;a pas répondu : l&apos;état de connexion de ce compte n&apos;a pas pu être
          lu. Recharge la page dans un instant.
        </p>
      </Card>
    );
  }

  const confirmed = state.emailConfirmedAt !== null;
  return (
    <Card title={USER_CARDS.signIn} pad>
      <div className="a-defrow">
        <span className="a-defrow-label">Adresse e-mail</span>
        {state.emailConfirmedAt !== null ? (
          <span className="mono a-field-hint">
            Confirmée le {formatDate(state.emailConfirmedAt)}
          </span>
        ) : (
          <Tag tone="warning">Non confirmée</Tag>
        )}
      </div>
      <div className="a-defrow">
        <span className="a-defrow-label">Méthodes de connexion</span>
        <span className="mono a-field-hint">
          {state.providers.length > 0
            ? state.providers.map((provider) => PROVIDER_LABEL[provider] ?? provider).join(" · ")
            : "Aucune"}
        </span>
      </div>
      <div className="a-defrow">
        <span className="a-defrow-label">Double authentification</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {state.verifiedTotp > 0 ? (
            <Tag tone="accent">Active</Tag>
          ) : (
            <span className="mono a-field-hint">Inactive</span>
          )}
          {state.pendingTotp > 0 && (
            <span className="mono a-field-hint">
              {state.pendingTotp > 1
                ? `${String(state.pendingTotp)} activations commencées, jamais terminées`
                : "1 activation commencée, jamais terminée"}
            </span>
          )}
        </span>
      </div>
      <div className="a-defrow">
        <span className="a-defrow-label">Dernière connexion</span>
        <span className="mono a-field-hint">
          {state.lastSignInAt !== null ? formatDate(state.lastSignInAt) : "Jamais"}
        </span>
      </div>

      <SignInActions userId={userId} email={email} confirmed={confirmed} canRevoke={canRevoke} />
    </Card>
  );
}
