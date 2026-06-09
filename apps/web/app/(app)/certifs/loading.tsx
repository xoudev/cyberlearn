import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 3;

export default function CertificatesLoading(): React.ReactElement {
  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span style={{ width: 16, height: 1, background: "#0AFFD4", display: "inline-block" }} />
          <Skeleton w={110} h={10} />
        </div>
        <Skeleton w={300} h={30} style={{ margin: "0 0 12px" }} />
        <Skeleton w={180} h={12} />
      </div>

      {/* Certificate cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div
            key={`cert-skel-${String(i)}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "24px 28px",
              background: "#0A0826",
              border: "1px solid #1F1B47",
            }}
          >
            {/* Icon */}
            <Skeleton w={56} h={56} radius={0} style={{ flexShrink: 0 }} />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton w={220} h={16} style={{ marginBottom: 8 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <Skeleton w={90} h={11} />
                <Skeleton w={70} h={16} radius="pill" />
                <Skeleton w={40} h={11} />
                <Skeleton w={130} h={11} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <Skeleton w={88} h={32} radius={0} />
              <Skeleton w={128} h={32} radius={0} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
