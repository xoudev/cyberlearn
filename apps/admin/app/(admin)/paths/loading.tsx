import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CELL_WIDTHS = ["15%", "26%", "10%", "12%", "10%", "12%", "8%"] as const;
const ROW_COUNT = 6;

export default function AdminPathsLoading(): React.ReactElement {
  return (
    <div className="a-page">
      {/* Header */}
      <div className="a-page-head">
        <div>
          <Skeleton width={140} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={220} height={14} />
        </div>
        <Skeleton width={120} height={44} />
      </div>

      {/* Table */}
      <div
        className="admin-table-wrap"
        style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)" }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: CELL_WIDTHS.join(" "),
            gap: 12,
            padding: "14px 20px",
            borderBottom: "1px solid var(--a-border)",
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
              borderBottom: row < ROW_COUNT - 1 ? "1px solid var(--a-border)" : "none",
            }}
          >
            <Skeleton height={13} style={{ width: "80%" }} />
            <Skeleton height={13} style={{ width: "90%" }} />
            <Skeleton height={20} style={{ width: 64 }} />
            <Skeleton height={20} style={{ width: 80 }} />
            <Skeleton height={13} style={{ width: "70%" }} />
            <Skeleton height={20} style={{ width: 68 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Skeleton width={44} height={44} />
              <Skeleton width={44} height={44} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
