import React from "react";
import { PageHeader } from "../_components/admin-ui";
import { DataGridSkeleton, KpiGridSkeleton } from "../_components/data-grid-skeleton";
import {
  CERTIFICATE_COLUMNS,
  CERTIFICATE_KPI_LABELS,
  CERTIFICATES_HEADER,
} from "./_components/columns";

/** The certificate list while it loads: its header, figures and grid, from the page's own constants. */
export default function AdminCertificatesLoading(): React.ReactElement {
  return (
    <main className="a-page">
      <PageHeader
        crumbs={CERTIFICATES_HEADER.crumbs}
        title={CERTIFICATES_HEADER.title}
        description={CERTIFICATES_HEADER.description}
      />
      <KpiGridSkeleton labels={CERTIFICATE_KPI_LABELS} />
      <DataGridSkeleton columns={CERTIFICATE_COLUMNS} facets={2} rows={10} />
    </main>
  );
}
