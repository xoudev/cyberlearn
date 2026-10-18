import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { contentReportRepository, type ReportedContent } from "@cyberlearn/db";
import {
  CONTENT_REPORT_REASON_KEYS,
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_SURFACE_LABEL,
} from "@cyberlearn/lib/moderation/report-reasons";
import { EmptyState, GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { ContentActions } from "../_components/content-actions";
import { AuthorLink, ContentPlace, ContentState, ContentText } from "../_components/content-cells";
import { REPORTS_HEADER } from "../_components/moderation-head";
import { gridHref } from "@/lib/grid-href";
import type { RawParams } from "@/lib/grid-params";
import { REPORTS_PAGE_SIZE, parseReportListParams, reportQueryOf } from "@/lib/list-params";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Signalements" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

function ReportedContentCard({ group }: { group: ReportedContent }): React.ReactElement {
  const { content } = group;
  const counts = CONTENT_REPORT_REASON_KEYS.map((key) => ({
    key,
    n: group.reports.filter((r) => r.reason === key).length,
  })).filter((c) => c.n > 0);

  return (
    <section className="a-card">
      <div className="a-card-head a-report-head">
        <div className="a-report-title">
          <div className="a-report-meta">
            <span className="a-report-ref">{CONTENT_SURFACE_LABEL[group.surface]}</span>
            <Tag tone="warning">
              {group.reports.length} signalement{group.reports.length > 1 ? "s" : ""}
            </Tag>
            {content?.isHidden === true && (
              <ContentState content={content} hiddenLabel="Déjà masqué" />
            )}
            {content?.opensThread === true && <Tag>Ouvre le sujet</Tag>}
          </div>
        </div>
      </div>
      <div className="a-card-pad a-report-body">
        {content === null ? (
          <p className="a-field-hint" style={{ margin: 0 }}>
            Ce contenu n&apos;existe plus : son auteur ou un enseignant l&apos;a retiré, ou son
            compte a été supprimé. Il ne reste qu&apos;à classer ces signalements.
          </p>
        ) : (
          <>
            <div className="a-report-meta">
              <AuthorLink author={content.author} />
              <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
                <ContentPlace content={content} /> · {DATE.format(content.createdAt)}
              </span>
            </div>
            <ContentText content={content} whole />
          </>
        )}
        <div className="a-report-meta">
          {counts.map((c) => (
            <Tag key={c.key}>
              {CONTENT_REPORT_REASON_LABELS[c.key]} × {c.n}
            </Tag>
          ))}
        </div>
        <ul className="a-report-list">
          {group.reports.map((r) => (
            <li key={r.id}>
              <span className="a-report-small">
                {DATE.format(r.createdAt)} ·{" "}
                {r.reporterUsername !== null ? `@${r.reporterUsername}` : "compte supprimé"} ·{" "}
                {CONTENT_REPORT_REASON_LABELS[r.reason]}
              </span>
              {r.comment !== null ? <p>{r.comment}</p> : null}
            </li>
          ))}
        </ul>
        {content === null ? (
          <ContentActions
            surface={group.surface}
            contentId={group.contentId}
            hidden
            pendingReview={false}
            opensThread={false}
            replies={0}
            withDismiss
            dismissOnly
          />
        ) : (
          <ContentActions
            surface={group.surface}
            contentId={group.contentId}
            hidden={content.isHidden}
            pendingReview={content.pendingReview}
            authorWithdrew={content.authorWithdrew}
            opensThread={content.opensThread}
            replies={content.replies}
            withDismiss
          />
        )}
      </div>
    </section>
  );
}

/** Previous and next, as links: the queue is paged by the URL (?page=). */
function ReportsPager({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}): React.ReactElement | null {
  if (pageCount <= 1) return null;
  const href = (target: number): string =>
    gridHref("/moderation/reports", {}, { page: target > 1 ? String(target) : null });
  // The grid's pager strip, framed as a card of its own under the cards.
  return (
    <nav className="a-card a-pager" aria-label="Pagination" style={{ marginTop: 14 }}>
      <span>
        Page {page} / {pageCount} · {total.toLocaleString("fr-FR")} contenu{total > 1 ? "s" : ""}
      </span>
      <div className="a-pager-btns">
        {page > 1 ? (
          <Link href={href(page - 1)} className="a-pager-btn" aria-label="Page précédente">
            ←
          </Link>
        ) : (
          <span className="a-pager-btn" aria-disabled="true" data-disabled="true">
            ←
          </span>
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className="a-pager-btn" aria-label="Page suivante">
            →
          </Link>
        ) : (
          <span className="a-pager-btn" aria-disabled="true" data-disabled="true">
            →
          </span>
        )}
      </div>
    </nav>
  );
}

/**
 * What learners reported about each other's content. Kept apart from the
 * filter's queue: a report is one person's claim, and nothing is held
 * against the author until somebody here has read the content. One card per
 * content, the most reported first, 20 to a page (?page=): the database
 * groups and pages them.
 */
export default async function ContentReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseReportListParams(await searchParams);
  const queue = await contentReportRepository.openByContent(reportQueryOf(params));
  const contents = queue.total;
  const reports = queue.openReports;
  const pageCount = Math.max(1, Math.ceil(contents / REPORTS_PAGE_SIZE));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={REPORTS_HEADER.crumbs}
        title={REPORTS_HEADER.title}
        description={
          contents === 0
            ? REPORTS_HEADER.description
            : `${String(reports)} signalement${reports > 1 ? "s" : ""} ouvert${reports > 1 ? "s" : ""} sur ${String(contents)} contenu${contents > 1 ? "s" : ""}. ${REPORTS_HEADER.description}`
        }
        actions={<GhostLink href="/moderation/content">Contenus publiés</GhostLink>}
      />
      {queue.rows.length === 0 ? (
        <EmptyState title="Aucun signalement ouvert" text="Rien à relire pour l'instant." />
      ) : (
        <>
          <div className="a-report-cards">
            {queue.rows.map((g) => (
              <ReportedContentCard key={`${g.surface}:${g.contentId}`} group={g} />
            ))}
          </div>
          <ReportsPager page={queue.page} pageCount={pageCount} total={contents} />
        </>
      )}
    </main>
  );
}
