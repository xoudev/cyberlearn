import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LessonsLoading(): React.ReactElement {
  return (
    <div className="page-container">
      {/* Breadcrumb placeholder */}
      <Skeleton style={{ height: 13, width: 240, marginBottom: 22 }} />

      {/* Header */}
      <div className="catalog-header-grid" style={{ marginBottom: 32 }}>
        <div>
          <Skeleton style={{ height: 52, width: "40%", marginBottom: 14 }} />
          <Skeleton style={{ height: 14, width: "70%" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton style={{ height: 11, width: "55%" }} />
          <Skeleton style={{ height: 11, width: "40%" }} />
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 24, alignItems: "center" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={{ width: 90, height: 34 }} />
        ))}
      </div>

      {/* Cards grid */}
      <div className="lessons-catalog-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#0A0826",
              border: "1px solid #1F1B47",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Skeleton style={{ width: 64, height: 20, borderRadius: 99 }} />
              <Skeleton style={{ width: 80, height: 20, borderRadius: 99 }} />
            </div>
            <Skeleton style={{ height: 16, width: "85%" }} />
            <Skeleton style={{ height: 13, width: "65%" }} />
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <Skeleton style={{ width: 44, height: 12 }} />
              <Skeleton style={{ width: 56, height: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
