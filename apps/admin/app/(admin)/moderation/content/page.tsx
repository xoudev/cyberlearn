import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  contentModerationRepository,
  contentReportRepository,
  userRepository,
} from "@cyberlearn/db";
import {
  CONTENT_REPORT_SURFACE_KEYS,
  CONTENT_SURFACE_LABEL,
} from "@cyberlearn/lib/moderation/report-reasons";
import { GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import { formatDay } from "../../users/_components/dates";
import { gridHref } from "@/lib/grid-href";
import type { RawParams } from "@/lib/grid-params";
import {
  CONTENT_PAGE_SIZE,
  DEFAULT_CONTENT_SURFACE,
  contentListSearch,
  contentQueryOf,
  parseContentListParams,
} from "@/lib/list-params";
import { ContentActions } from "../_components/content-actions";
import { AuthorLink, ContentPlace, ContentState, ContentText } from "../_components/content-cells";
import { CONTENT_COLUMNS } from "../_components/content-columns";
import { CONTENT_HEADER } from "../_components/moderation-head";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Contenus publiés" };

/**
 * Everything learners publish to each other, one surface at a time (five
 * tables, five shapes of row), 25 to a page: the surface, the state, the
 * search, the author and the page are the URL's
 * (?surface=&state=&q=&author=&page=), and the database reads that page alone.
 * Hiding, showing again and deleting happen on the row.
 *
 * `author` is an account's id, the link of its page in the console: exactly
 * what that account wrote, where a search on its name would also find the
 * messages that quote it.
 */
export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseContentListParams(await searchParams);
  const [slice, reported, author] = await Promise.all([
    contentModerationRepository.listForConsole(contentQueryOf(params)),
    contentReportRepository.countOpenContents(),
    params.author === undefined
      ? Promise.resolve(null)
      : userRepository.findConsoleTarget(params.author),
  ]);

  const rows: GridRowBase[] = slice.rows.map((c) => ({
    id: c.id,
    cells: [
      <span key="c" style={{ display: "grid", gap: 4, maxWidth: 420 }}>
        <ContentText content={c} />
        <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
          <ContentPlace content={c} />
        </span>
      </span>,
      <AuthorLink key="a" author={c.author} />,
      <span key="d" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
        {formatDay(c.createdAt)}
      </span>,
      c.openReports > 0 ? (
        <Link key="r" href="/moderation/reports" style={{ color: "var(--a-accent)" }}>
          <Tag tone="warning">{c.openReports}</Tag>
        </Link>
      ) : (
        <span key="r" style={{ color: "var(--a-faint)" }}>
          -
        </span>
      ),
      <span key="s" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <ContentState content={c} />
        {c.opensThread && <Tag>Ouvre le sujet</Tag>}
      </span>,
      <ContentActions
        key="x"
        surface={c.surface}
        contentId={c.id}
        hidden={c.isHidden}
        pendingReview={c.pendingReview}
        authorWithdrew={c.authorWithdrew}
        opensThread={c.opensThread}
        replies={c.replies}
      />,
    ],
  }));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={CONTENT_HEADER.crumbs}
        title={CONTENT_HEADER.title}
        description={CONTENT_HEADER.description}
        actions={
          <GhostLink href="/moderation/reports">Signalements · {String(reported)}</GhostLink>
        }
      />

      {params.author !== undefined && (
        <p
          className="a-field-hint"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            margin: "0 0 16px",
          }}
        >
          <span>
            Contenus publiés par{" "}
            {author === null ? (
              "un compte introuvable"
            ) : (
              <Link href={`/users/${author.id}`} style={{ color: "var(--a-accent)" }}>
                {author.displayName}
              </Link>
            )}
            .
          </span>
          <Link
            href={gridHref("/moderation/content", {
              ...(params.surface !== DEFAULT_CONTENT_SURFACE && { surface: params.surface }),
              ...(params.state !== undefined && { state: params.state }),
            })}
            className="a-btn a-btn--ghost a-btn--sm"
          >
            Tous les contenus
          </Link>
        </p>
      )}

      {/* One surface at a time: a link each, which keeps the state filter and
          the author, and drops the search and the page, both of them the other
          surface's. */}
      <nav
        aria-label="Type de contenu"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        {CONTENT_REPORT_SURFACE_KEYS.map((surface) => {
          const active = surface === params.surface;
          return (
            <Link
              key={surface}
              href={gridHref("/moderation/content", {
                ...(surface !== DEFAULT_CONTENT_SURFACE && { surface }),
                ...(params.state !== undefined && { state: params.state }),
                ...(params.author !== undefined && { author: params.author }),
              })}
              aria-current={active ? "page" : undefined}
              className={`a-btn a-btn--sm ${active ? "a-btn--primary" : "a-btn--ghost"}`}
            >
              {CONTENT_SURFACE_LABEL[surface]}
            </Link>
          );
        })}
      </nav>

      <DataGrid
        columns={CONTENT_COLUMNS}
        rows={rows}
        server={{
          path: "/moderation/content",
          params: contentListSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: CONTENT_PAGE_SIZE,
        }}
        facets={[
          {
            key: "state",
            label: "État",
            value: params.state,
            options: [
              { value: "visible", label: "Visibles" },
              { value: "hidden", label: "Masqués" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher dans le texte, le sujet, la leçon ou l'auteur…"
        emptyTitle="Rien de publié ici"
        emptyText="Les contenus de ce type apparaissent ici dès qu'un apprenant en publie un."
      />
    </main>
  );
}
