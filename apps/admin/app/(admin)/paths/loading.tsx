import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CELL_WIDTHS = ["15%", "26%", "10%", "12%", "10%", "12%", "8%"] as const;
const ROW_COUNT = 6;

export default function AdminPathsLoading(): React.ReactElement {
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Skeleton width={140} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={220} height={14} />
        </div>
        <Skeleton width={120} height={36} style={{ borderRadius: 8 }} />
      </div>

      {/* Table */}
      <div
        className="admin-table-wrap"
        style={{ background: "#0A0826", border: "1px solid #1F1B47", borderRadius: 12 }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: CELL_WIDTHS.join(" "),
            gap: 12,
            padding: "14px 20px",
            borderBottom: "1px solid #1F1B47",
          }}
        >
          {CELL_WIDTHS.map((_, i) => (
            <Skeleton key={i} height={11} style={{ width: "55%" }} />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: ROW_COUNT }).map((_, row) => (
          <div
            key={row}
            style={{
              display: "grid",
              gridTemplateColumns: CELL_WIDTHS.join(" "),
              gap: 12,
              padding: "16px 20px",
              alignItems: "center",
              borderBottom: row < ROW_COUNT - 1 ? "1px solid #1F1B47" : "none",
            }}
          >
            <Skeleton height={13} style={{ width: "80%" }} />
            <Skeleton height={13} style={{ width: "90%" }} />
            <Skeleton height={20} style={{ width: 64, borderRadius: 99 }} />
            <Skeleton height={20} style={{ width: 80, borderRadius: 99 }} />
            <Skeleton height={13} style={{ width: "70%" }} />
            <Skeleton height={20} style={{ width: 68, borderRadius: 99 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Skeleton width={28} height={28} style={{ borderRadius: 6 }} />
              <Skeleton width={28} height={28} style={{ borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
