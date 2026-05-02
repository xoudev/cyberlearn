import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CARD: React.CSSProperties = {
  background: "#0A0826",
  border: "1px solid #1F1B47",
  borderRadius: 12,
  padding: 20,
  position: "relative",
};

export default function AdminDashboardLoading(): React.ReactElement {
  return (
    <div className="admin-page-content">
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <Skeleton width={220} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={160} height={14} />
        </div>
        <Skeleton width={120} height={36} style={{ borderRadius: 8 }} />
      </div>

      {/* Stats grid — 4 cards */}
      <div className="admin-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={CARD}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <Skeleton width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={10} />
              </div>
            </div>
            <Skeleton width="50%" height={32} style={{ marginBottom: 8 }} />
            <Skeleton width="70%" height={10} />
          </div>
        ))}
      </div>

      {/* 2-col: activity log + recent users */}
      <div className="admin-2col-grid">
        {/* Activity log */}
        <div style={CARD}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Skeleton width={160} height={18} />
            <Skeleton width={80} height={26} style={{ borderRadius: 6 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Skeleton
                  width={8}
                  height={8}
                  style={{ borderRadius: "50%", marginTop: 5, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <Skeleton width="75%" height={13} style={{ marginBottom: 6 }} />
                  <Skeleton width="45%" height={11} />
                </div>
                <Skeleton width={52} height={11} style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div style={CARD}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Skeleton width={140} height={18} />
            <Skeleton width={80} height={26} style={{ borderRadius: 6 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Skeleton width={36} height={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="55%" height={13} style={{ marginBottom: 6 }} />
                  <Skeleton width="75%" height={11} />
                </div>
                <Skeleton width={56} height={22} style={{ borderRadius: 99, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
