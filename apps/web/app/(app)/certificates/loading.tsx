import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 3;

export default function CertificatesLoading(): React.ReactElement {
  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <Skeleton h={13} w={240} style={{ marginBottom: 26 }} />

      {/* Header: title block left + telemetry right */}
      <div className="catalog-header-grid" style={{ marginBottom: 40 }}>
        <div>
          <Skeleton h={11} w={260} style={{ marginBottom: 14 }} />
          <Skeleton h={64} w="65%" style={{ marginBottom: 16 }} />
          <Skeleton h={14} w="80%" style={{ marginBottom: 8 }} />
          <Skeleton h={14} w="55%" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton h={11} w={300} />
          <Skeleton h={1} w={320} />
          <Skeleton h={11} w={280} />
        </div>
      </div>

      {/* Certificate cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 18,
        }}
      >
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div
            key={`cert-skel-${String(i)}`}
            style={{
              background: "rgba(10,8,38,0.5)",
              border: "1px solid #1F1B47",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "22px 24px 20px", flex: 1 }}>
              {/* Eyebrow + seal */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <Skeleton h={10} w={90} style={{ marginBottom: 8 }} />
                  <Skeleton h={9} w={120} />
                </div>
                <Skeleton w={30} h={34} radius={0} />
              </div>
              {/* Title */}
              <Skeleton h={22} w="85%" style={{ marginBottom: 12 }} />
              {/* Meta row */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <Skeleton h={11} w={90} />
                <Skeleton h={16} w={70} radius={0} />
                <Skeleton h={11} w={36} />
              </div>
              {/* Authenticity rows */}
              <div
                style={{
                  borderTop: "1px solid #1A1640",
                  paddingTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <Skeleton h={10} w="100%" />
                <Skeleton h={10} w="100%" />
                <Skeleton h={10} w="80%" />
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: "flex", borderTop: "1px solid #1A1640" }}>
              <Skeleton h={40} style={{ flex: 1, borderRadius: 0 }} />
              <Skeleton h={40} style={{ flex: 1.3, borderRadius: 0 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
