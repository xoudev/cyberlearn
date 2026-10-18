import React from "react";
import type { Metadata } from "next";
import { contentReportRepository, type ReportedContent } from "@cyberlearn/db";
import {
  CONTENT_REPORT_REASON_KEYS,
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_SURFACE_LABEL,
} from "@cyberlearn/lib/moderation/report-reasons";
import { EmptyState, GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { ContentActions } from "../_components/content-actions";
import { AuthorLink, ContentPlace, ContentText } from "../_components/content-cells";
import { REPORTS_HEADER } from "../_components/moderation-head";

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
            {content?.isHidden === true && <Tag tone="danger">Déjà masqué</Tag>}
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
            pendingReview={false}
            opensThread={content.opensThread}
            replies={content.replies}
            withDismiss
          />
        )}
      </div>
    </section>
  );
}

/**
 * What learners reported about each other's content. Kept apart from the
 * filter's queue: a report is one person's claim, and nothing is held
 * against the author until somebody here has read the content.
 */
export default async function ContentReportsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const groups = await contentReportRepository.openByContent();
  const total = groups.reduce((n, g) => n + g.reports.length, 0);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={REPORTS_HEADER.crumbs}
        title={REPORTS_HEADER.title}
        description={
          groups.length === 0
            ? REPORTS_HEADER.description
            : `${String(total)} signalement${total > 1 ? "s" : ""} ouvert${total > 1 ? "s" : ""} sur ${String(groups.length)} contenu${groups.length > 1 ? "s" : ""}. ${REPORTS_HEADER.description}`
        }
        actions={<GhostLink href="/moderation/content">Contenus publiés</GhostLink>}
      />
      {groups.length === 0 ? (
        <EmptyState title="Aucun signalement ouvert" text="Rien à relire pour l'instant." />
      ) : (
        <div className="a-report-cards">
          {groups.map((g) => (
            <ReportedContentCard key={`${g.surface}:${g.contentId}`} group={g} />
          ))}
        </div>
      )}
    </main>
  );
}
