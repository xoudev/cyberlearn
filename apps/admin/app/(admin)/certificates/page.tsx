import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { certificateRepository, type ConsoleCertificateRow } from "@cyberlearn/db";
import { certificateCode } from "@cyberlearn/lib/social/certificate-code";
import { KpiCard, PageHeader, Tag } from "../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../_components/data-grid";
import { formatDay } from "../users/_components/dates";
import type { RawParams } from "@/lib/grid-params";
import { learnerUrl } from "@/lib/learner-url";
import {
  CERTIFICATES_PAGE_SIZE,
  certificateListSearch,
  certificateQueryOf,
  DEFAULT_CERTIFICATE_SORT,
  parseCertificateListParams,
  withKnownPath,
} from "@/lib/list-params";
import { CertificateActionsMenu } from "./_components/certificate-actions-menu";
import {
  CERTIFICATE_COLUMNS,
  CERTIFICATE_KPI_LABELS,
  CERTIFICATES_HEADER,
} from "./_components/columns";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Certificats" };

/**
 * The name the certificate carries: the one printed on the PDF, kept with the
 * row. The account's own name only for a row issued before it was kept.
 */
function holderOf(row: ConsoleCertificateRow): string {
  return row.holderName ?? row.user?.displayName ?? "Titulaire inconnu";
}

/**
 * The verification page on the learner site, or null when the deployment
 * points that address at the console itself (learnerUrl refuses it): the
 * number is still shown, without a link nobody could follow.
 */
function verifyHref(publicId: string): string | null {
  try {
    return learnerUrl(`/verify/${publicId}`);
  } catch {
    return null;
  }
}

/**
 * The certificates, 25 at a time: the search, the path and state filters, the
 * sort and the page are the URL's (?q=&path=&status=&sort=&page=), and the
 * database reads that page alone. Revoking one, and putting a revoked one
 * back, happen on its row.
 */
export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const raw = await searchParams;
  const [counts, paths] = await Promise.all([
    certificateRepository.consoleCounts(new Date()),
    certificateRepository.consolePathOptions(),
  ]);
  const params = withKnownPath(
    parseCertificateListParams(raw),
    paths.map((p) => p.id),
  );
  const slice = await certificateRepository.listForConsole(certificateQueryOf(params));

  const rows: GridRowBase[] = slice.rows.map((c) => {
    const holder = holderOf(c);
    const code = certificateCode(c.publicId, c.issuedAt);
    const href = verifyHref(c.publicId);
    const revoked = c.revokedAt !== null;
    const account = c.user?.username ? `@${c.user.username}` : (c.user?.email ?? null);

    return {
      id: c.id,
      cells: [
        c.userId !== null ? (
          <Link key="h" href={`/users/${c.userId}`} className="a-row-link">
            <span style={{ display: "grid", gap: 2 }}>
              <span className="a-row-link-title">{holder}</span>
              {account !== null && (
                <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
                  {account}
                </span>
              )}
            </span>
          </Link>
        ) : (
          // An erased account: the certificate outlives it, under the name the
          // erasure wrote, and there is no account left to open.
          <span key="h" style={{ color: "var(--a-muted)" }}>
            {holder}
          </span>
        ),
        <span key="p">{c.path.title}</span>,
        c.score !== null ? (
          `${String(c.score)} %`
        ) : (
          // A path without a final exam issues its certificates without a score.
          <span key="sc" style={{ color: "var(--a-faint)" }}>
            -
          </span>
        ),
        <span key="i" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
          {formatDay(c.issuedAt)}
        </span>,
        revoked ? (
          <span key="s" style={{ display: "grid", gap: 4, maxWidth: 280 }}>
            <span>
              <Tag tone="danger">Révoqué</Tag>
              {c.revokedAt !== null && (
                <span className="mono" style={{ color: "var(--a-muted)", marginLeft: 8 }}>
                  {formatDay(c.revokedAt)}
                </span>
              )}
            </span>
            {c.revokedReason !== null && (
              <span style={{ color: "var(--a-muted)", fontSize: 12, whiteSpace: "normal" }}>
                {c.revokedReason}
              </span>
            )}
          </span>
        ) : (
          <Tag key="s" tone="accent">
            Valide
          </Tag>
        ),
        href !== null ? (
          <a
            key="n"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{ color: "var(--a-accent)", whiteSpace: "nowrap" }}
          >
            {code} ↗
          </a>
        ) : (
          <span key="n" className="mono" style={{ whiteSpace: "nowrap" }}>
            {code}
          </span>
        ),
        <CertificateActionsMenu
          key="a"
          certificateId={c.id}
          code={code}
          holder={holder}
          pathTitle={c.path.title}
          revoked={revoked}
        />,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={CERTIFICATES_HEADER.crumbs}
        title={CERTIFICATES_HEADER.title}
        description={CERTIFICATES_HEADER.description}
      />

      <div className="a-kpi-grid">
        <KpiCard label={CERTIFICATE_KPI_LABELS[0]} value={counts.total.toLocaleString("fr-FR")} />
        <KpiCard
          label={CERTIFICATE_KPI_LABELS[1]}
          value={counts.active.toLocaleString("fr-FR")}
          tone="accent"
        />
        <KpiCard
          label={CERTIFICATE_KPI_LABELS[2]}
          value={counts.revoked.toLocaleString("fr-FR")}
          tone="danger"
        />
        <KpiCard
          label={CERTIFICATE_KPI_LABELS[3]}
          value={counts.lastMonth.toLocaleString("fr-FR")}
          tone="purple"
        />
      </div>

      <DataGrid
        columns={CERTIFICATE_COLUMNS}
        rows={rows}
        server={{
          path: "/certificates",
          params: certificateListSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: CERTIFICATES_PAGE_SIZE,
          sort: params.sort,
          defaultSort: DEFAULT_CERTIFICATE_SORT,
        }}
        facets={[
          {
            key: "path",
            label: "Parcours",
            value: params.path,
            options: paths.map((p) => ({ value: p.id, label: p.title })),
          },
          {
            key: "status",
            label: "Statut",
            value: params.status,
            options: [
              { value: "active", label: "Valides" },
              { value: "revoked", label: "Révoqués" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher un titulaire, un parcours, un numéro CL-…"
        emptyTitle="Aucun certificat émis"
        emptyText="Un certificat apparaît ici dès qu'un apprenant termine un parcours du catalogue."
      />
    </main>
  );
}
