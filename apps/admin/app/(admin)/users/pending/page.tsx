import React from "react";
import type { Metadata } from "next";
import { userRepository } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { EmptyState, PageHeader } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import type { RawParams } from "@/lib/grid-params";
import { parsePendingListParams, pendingListSearch, USERS_PAGE_SIZE } from "@/lib/list-params";
import {
  AUTH_PAGE_SIZE,
  AUTH_SCAN_PAGES,
  listPendingSignUps,
  type PendingSignUpList,
} from "@/lib/services/pending-signups.service";
import { PENDING_COLUMNS, USERS_HEADER } from "../_components/columns";
import { PendingSignUpActions } from "../_components/pending-sign-up-actions";
import { formatDay, relativeDay } from "../_components/dates";
import { UsersKpis, UsersTabs } from "../_components/users-head";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Inscriptions en attente" };

/** How Supabase names a sign-in method, and how support says it. */
const PROVIDER_LABEL: Record<string, string> = {
  email: "Mot de passe",
  github: "GitHub",
};

/**
 * The sign-ups whose address was never confirmed. They have no profile yet,
 * so the account list cannot show them: they are read from Supabase Auth, and
 * the mail can be sent again, or the address confirmed, from here.
 */
export default async function PendingSignUpsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parsePendingListParams(await searchParams);
  const [counts, list] = await Promise.all([
    userRepository.consoleCounts(new Date()),
    // Supabase Auth unavailable is a notice on the page, not an error page.
    listPendingSignUps({ q: params.q, page: params.page, pageSize: USERS_PAGE_SIZE }).catch(
      (error: unknown): PendingSignUpList | null => {
        logger.error({ scope: "admin", err: errorMessage(error) }, "pending sign-ups read failed");
        return null;
      },
    ),
  ]);

  const rows: GridRowBase[] = (list?.rows ?? []).map((signUp) => ({
    id: signUp.id,
    cells: [
      <span key="e" className="mono" style={{ color: "var(--a-fg)" }}>
        {signUp.email}
      </span>,
      <span key="p" style={{ color: "var(--a-muted)" }}>
        {PROVIDER_LABEL[signUp.provider] ?? signUp.provider}
      </span>,
      <span key="c" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
        {formatDay(signUp.createdAt)}
      </span>,
      <span key="s" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
        {signUp.confirmationSentAt === null ? "jamais" : relativeDay(signUp.confirmationSentAt)}
      </span>,
      <PendingSignUpActions key="a" userId={signUp.id} email={signUp.email} />,
    ],
  }));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={USERS_HEADER.crumbs}
        title={USERS_HEADER.title}
        description={USERS_HEADER.description}
      />
      <UsersKpis counts={counts} />
      <UsersTabs current="pending" />

      <p className="a-sub a-tab-note">
        Les comptes créés sur le site dont l&apos;adresse n&apos;a jamais été confirmée. Ils
        n&apos;ont pas encore de profil : il se crée à la première connexion, et une adresse non
        confirmée ne permet pas de se connecter.
        {list?.truncated === true &&
          ` Seuls les ${(AUTH_PAGE_SIZE * AUTH_SCAN_PAGES).toLocaleString("fr-FR")} premiers comptes de Supabase Auth ont été parcourus.`}
      </p>

      {list === null ? (
        <section className="a-card">
          <EmptyState
            title="Liste indisponible"
            text="Les comptes de Supabase Auth n'ont pas pu être lus. Réessaie dans un instant."
          />
        </section>
      ) : (
        <DataGrid
          columns={PENDING_COLUMNS}
          rows={rows}
          server={{
            path: "/users/pending",
            params: pendingListSearch({ ...params, page: list.page }),
            total: list.total,
            page: list.page,
            pageSize: USERS_PAGE_SIZE,
          }}
          searchPlaceholder="Rechercher une adresse…"
          emptyTitle="Aucune inscription en attente"
          emptyText="Toutes les adresses inscrites ont été confirmées."
        />
      )}
    </main>
  );
}
