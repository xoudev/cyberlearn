import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CARD: React.CSSProperties = {
  background: "#0A0826",
  border: "1px solid #1F1B47",
  borderRadius: 12,
  padding: "28px 20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
};

export default function AdminBadgesLoading(): React.ReactElement {
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Skeleton width={140} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={200} height={14} />
        </div>
        <Skeleton width={120} height={36} style={{ borderRadius: 8 }} />
      </div>

      {/* Grid 3 cols */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={CARD}>
            {/* Hex shape */}
            <Skeleton
              width={88}
              height={88}
              style={{
                borderRadius: 0,
                clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                marginTop: 4,
              }}
            />
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} />
            <Skeleton width={80} height={22} style={{ borderRadius: 99 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
