import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CELL_WIDTHS = ["15%", "28%", "10%", "12%", "10%", "12%"] as const;
const ROW_COUNT = 8;

export default function AdminLessonsLoading(): React.ReactElement {
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Skeleton width={160} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={240} height={14} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton width={120} height={36} style={{ borderRadius: 8 }} />
          <Skeleton width={120} height={36} style={{ borderRadius: 8 }} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={88} height={32} style={{ borderRadius: 99 }} />
        ))}
      </div>

      {/* Table */}
      <div
        className="admin-table-wrap"
        style={{ background: "#0A0826", border: "1px solid #1F1B47", borderRadius: 12 }}
      >
        {/* Table header */}
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
            <Skeleton key={i} height={11} style={{ width: "60%" }} />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: ROW_COUNT }).map((_, row) => (
          <div
            key={row}
            style={{
              display: "grid",
              gridTemplateColumns: CELL_WIDTHS.join(" "),
              gap: 12,
              padding: "16px 20px",
              borderBottom: row < ROW_COUNT - 1 ? "1px solid #1F1B47" : "none",
            }}
          >
            <Skeleton height={13} style={{ width: "80%" }} />
            <Skeleton height={13} style={{ width: "90%" }} />
            <Skeleton height={20} style={{ width: 72, borderRadius: 99 }} />
            <Skeleton height={20} style={{ width: 80, borderRadius: 99 }} />
            <Skeleton height={20} style={{ width: 64, borderRadius: 99 }} />
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
