import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const CELL_WIDTHS = ["6%", "18%", "26%", "10%", "10%", "12%", "8%"] as const;
const ROW_COUNT = 10;

export default function AdminUsersLoading(): React.ReactElement {
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Skeleton width={160} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={200} height={14} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton width={200} height={36} style={{ borderRadius: 8 }} />
          <Skeleton width={110} height={36} style={{ borderRadius: 8 }} />
        </div>
      </div>

      {/* Table */}
      <div
        className="admin-table-wrap"
        style={{ background: "#0A0826", border: "1px solid #1F1B47", borderRadius: 12 }}
      >
        {/* Header */}
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
              padding: "12px 20px",
              alignItems: "center",
              borderBottom: row < ROW_COUNT - 1 ? "1px solid #1F1B47" : "none",
            }}
          >
            {/* Avatar */}
            <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
            <Skeleton height={13} style={{ width: "85%" }} />
            <Skeleton height={13} style={{ width: "90%" }} />
            <Skeleton height={20} style={{ width: 52, borderRadius: 99 }} />
            <Skeleton height={20} style={{ width: 60, borderRadius: 99 }} />
            <Skeleton height={13} style={{ width: "65%" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <Skeleton width={28} height={28} style={{ borderRadius: 6 }} />
              <Skeleton width={28} height={28} style={{ borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
