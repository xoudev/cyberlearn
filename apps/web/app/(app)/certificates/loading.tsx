import React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

/**
 * The certificates register while it loads, drawn on the page's own layout
 * (certificates/page.tsx): the breadcrumb, the `catalog-header-grid` header
 * with its eyebrow, title and telemetry, then the auto-fill grid of
 * certificate cards. The card has no class of its own, so it stands on
 * `SkeletonCard` with the card's own paddings, rows and action bar.
 */

const RULE = "1px solid var(--color-border-subtle)";

function CertificateCardSkeleton(): React.ReactElement {
  return (
    <SkeletonCard style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "22px 24px 20px", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <Skeleton w={84} h={9} style={{ marginBottom: 11 }} />
            <Skeleton w={130} h={9} />
          </div>
          <Skeleton w={30} h={34} />
        </div>
        <Skeleton w="78%" h={21} style={{ marginBottom: 14 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <Skeleton w={110} h={11} />
          <Skeleton w={78} h={19} />
          <Skeleton w={30} h={11} />
        </div>
        <div
          style={{
            borderTop: RULE,
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {[
            { label: 76, value: 120 },
            { label: 92, value: 36 },
            { label: 54, value: 128 },
          ].map((row) => (
            <div
              key={row.label}
              style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}
            >
              <Skeleton w={row.label} h={10} />
              <Skeleton w={row.value} h={10} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", borderTop: RULE }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            padding: "15px 16px",
            borderRight: RULE,
          }}
        >
          <Skeleton w={70} h={10} />
        </div>
        <Skeleton h={40} style={{ flex: 1.3 }} />
      </div>
    </SkeletonCard>
  );
}

export default function CertificatesLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement des certificats">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={200} h={12} />
      </div>

      <div className="catalog-header-grid" style={{ marginBottom: 40 }} aria-hidden="true">
        <div>
          <Skeleton w={300} h={11} style={{ marginBottom: 17, maxWidth: "100%" }} />
          <Skeleton
            w={560}
            h="clamp(40px, 5.5vw, 72px)"
            style={{ maxWidth: "90%", marginBottom: 16 }}
          />
          <SkeletonText
            lines={2}
            lastWidth="56%"
            lineHeight={14}
            gap={9}
            style={{ maxWidth: 520 }}
          />
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}
        >
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap", padding: "3px 0" }}>
            <Skeleton w={64} h={11} />
            <Skeleton w={84} h={11} />
            <Skeleton w={104} h={11} />
          </div>
          <Skeleton w={320} h={1} style={{ maxWidth: "100%" }} />
          <Skeleton w={350} h={11} style={{ maxWidth: "100%", margin: "3px 0" }} />
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
          gap: 18,
        }}
      >
        <CertificateCardSkeleton />
        <CertificateCardSkeleton />
        <CertificateCardSkeleton />
      </div>
    </div>
  );
}
