import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* Status strip */}
      <Skeleton style={{ height: 13, width: "55%" }} />

      {/* Hero grid */}
      <div className="dash-hero-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Skeleton style={{ height: 12, width: 140 }} />
          <Skeleton style={{ height: 80, width: "55%" }} />
          <Skeleton style={{ height: 14, width: "50%" }} />
        </div>
        <div
          style={{
            background: "#0A0826",
            border: "1px solid #1F1B47",
            padding: 28,
          }}
        >
          <Skeleton style={{ height: 12, width: "35%", marginBottom: 14 }} />
          <Skeleton style={{ height: 96, width: "30%", marginBottom: 14 }} />
          <Skeleton style={{ height: 12, width: "100%", marginBottom: 8 }} />
          <Skeleton style={{ height: 10, width: "65%" }} />
        </div>
      </div>

      {/* En cours section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Skeleton style={{ height: 36, width: "30%" }} />
        <Skeleton style={{ height: 200, background: "#0A0826", border: "1px solid #1F1B47" }} />
      </div>

      {/* Révisions section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Skeleton style={{ height: 36, width: "30%" }} />
        <div style={{ border: "1px solid #2A2560" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: "18px 24px",
                borderBottom: i < 2 ? "1px solid #2A2560" : "none",
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <Skeleton style={{ width: 44, height: 44, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton style={{ height: 14, width: "75%" }} />
                <Skeleton style={{ height: 11, width: "45%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
