import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { userRepository } from "@cyberlearn/db";
import { PageHeader, UserAvatar } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import type { RawParams } from "@/lib/grid-params";
import {
  DEFAULT_USER_SORT,
  parseUserListParams,
  USER_ROLE_VALUES,
  userListSearch,
  userQueryOf,
  USERS_PAGE_SIZE,
} from "@/lib/list-params";
import { ROLE_LABEL } from "@/lib/roles";
import { readDeletionNotice } from "@/lib/deletion-notice";
import { USER_COLUMNS, USERS_HEADER } from "../_components/columns";
import { DeletedAccountNotice } from "../_components/deleted-account-notice";
import { RoleSelect } from "../_components/role-select";
import { formatDay, relativeDay } from "../_components/dates";
import { UsersKpis, UsersTabs } from "../_components/users-head";

import { requireAdminPage } from "@/lib/auth";
import { resolveAvatarSrcs } from "@/lib/avatar";

export const metadata: Metadata = { title: "Utilisateurs" };

const WEEK_MS = 7 * 86_400_000;

/**
 * The accounts, one page of 25 at a time: the search, the role filter, the
 * sort and the page are the URL's (?q=&role=&sort=&page=), and the database
 * reads that page alone. The list used to load every account and filter them
 * in the browser.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const raw = await searchParams;
  const params = parseUserListParams(raw);
  // Set by a deletion, which has no page of its own left to answer on.
  const deletion = readDeletionNotice(raw);
  const [counts, slice] = await Promise.all([
    userRepository.consoleCounts(new Date()),
    userRepository.listForConsole(userQueryOf(params)),
  ]);

  const avatars = await resolveAvatarSrcs(slice.rows.map((u) => u.avatarUrl));

  const rows: GridRowBase[] = slice.rows.map((u, index) => {
    const isAdmin = u.role === "ADMIN";
    const handle = u.username ? `@${u.username}` : u.displayName || u.email;
    const recentlyActive = Date.now() - u.lastActiveAt.getTime() < WEEK_MS;

    return {
      id: u.id,
      cells: [
        // The row opens the account. Deleting one lives there rather than
        // here: a misclick in a sorted table is cheap, and that action is not
        // undoable.
        <Link key="u" href={`/users/${u.id}`} className="a-row-link">
          <UserAvatar
            src={avatars[index] ?? null}
            name={u.displayName || handle}
            size={30}
            tone={isAdmin ? "accent" : "neutral"}
          />
          <span className="a-row-link-title" style={{ whiteSpace: "nowrap" }}>
            {handle}
          </span>
        </Link>,
        <span key="e" className="mono" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
          {u.email}
        </span>,
        <RoleSelect key="r" userId={u.id} handle={handle} currentRole={u.role} />,
        <span key="l">
          <span style={{ color: "var(--a-muted)" }}>Niv. </span>
          <b className="a-mono" style={{ color: "var(--a-fg)" }}>
            {String(u.level)}
          </b>
        </span>,
        u.xpTotal.toLocaleString("fr-FR"),
        <span key="s" style={{ color: u.streakDays > 0 ? "var(--a-warning)" : "var(--a-faint)" }}>
          {String(u.streakDays)} j
        </span>,
        String(u._count.badges),
        String(u._count.certificates),
        <span key="c" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
          {formatDay(u.createdAt)}
        </span>,
        <span
          key="a"
          style={{
            color: recentlyActive ? "var(--a-success)" : "var(--a-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {relativeDay(u.lastActiveAt)}
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={USERS_HEADER.crumbs}
        title={USERS_HEADER.title}
        description={USERS_HEADER.description}
      />
      {deletion !== null && <DeletedAccountNotice notice={deletion} />}
      <UsersKpis counts={counts} />
      <UsersTabs current="accounts" />

      <DataGrid
        columns={USER_COLUMNS}
        rows={rows}
        server={{
          path: "/users",
          params: userListSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: USERS_PAGE_SIZE,
          sort: params.sort,
          defaultSort: DEFAULT_USER_SORT,
        }}
        facets={[
          {
            key: "role",
            label: "Rôle",
            value: params.role,
            options: USER_ROLE_VALUES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
          },
        ]}
        searchPlaceholder="Rechercher une adresse, un @pseudo, un nom…"
        emptyTitle="Aucun utilisateur trouvé"
        emptyText="Modifie la recherche ou le filtre de rôle."
      />
    </main>
  );
}
