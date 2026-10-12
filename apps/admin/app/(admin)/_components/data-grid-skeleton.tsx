import React from "react";
import type { GridColumn } from "./data-grid";

/**
 * The loading state of a DataGrid, drawn from the same column list the page
 * passes to the grid: the headers are the real ones, in the real order, and
 * only the cells wait. A skeleton drawn by hand next to the page is how the
 * account list came to load as seven columns and render as ten.
 *
 * Square, like the console: the shimmer's own rounding is turned off.
 */

/**
 * A shimmering bar. A span, so it can stand in for text anywhere, a page
 * description's <p> included, where a <div> would break the markup.
 */
export function Bar({
  width,
  height,
}: {
  width: number | string;
  height: number;
}): React.ReactElement {
  return (
    <span
      className="skeleton-shimmer"
      style={{ display: "inline-block", width, maxWidth: "100%", height, borderRadius: 0 }}
    />
  );
}

export function DataGridSkeleton({
  columns,
  facets = 0,
  search = true,
  rows = 10,
  selectable = false,
  leadLines = 1,
}: {
  columns: readonly GridColumn[];
  /** How many filter menus the toolbar holds. */
  facets?: number;
  search?: boolean;
  rows?: number;
  /** A checkbox column before the first. */
  selectable?: boolean;
  /** Lines in the first cell: a title with its reference under it is two. */
  leadLines?: number;
}): React.ReactElement {
  return (
    <section className="a-card" aria-hidden="true">
      <div className="a-toolbar">
        {search && <span className="a-search skeleton-shimmer" style={{ borderRadius: 0 }} />}
        {Array.from({ length: facets }, (_, index) => (
          <Bar key={index} width={132} height={36} />
        ))}
        <span className="a-toolbar-count">
          <Bar width={84} height={11} />
        </span>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              {selectable && (
                <th className="a-check-cell">
                  <Bar width={16} height={16} />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.label}
                  style={column.align === "right" ? { textAlign: "right" } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                {selectable && (
                  <td className="a-check-cell">
                    <Bar width={16} height={16} />
                  </td>
                )}
                {columns.map((column, index) => (
                  <td key={column.label}>
                    <SkeletonCell
                      right={column.align === "right"}
                      lines={index === 0 ? leadLines : 1}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="a-pager">
        <Bar width={150} height={11} />
        <div className="a-pager-btns">
          {Array.from({ length: 5 }, (_, index) => (
            <Bar key={index} width={30} height={30} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SkeletonCell({ right, lines }: { right: boolean; lines: number }): React.ReactElement {
  return (
    <span
      style={{
        display: "grid",
        gap: 6,
        justifyItems: right ? "end" : "start",
      }}
    >
      {Array.from({ length: lines }, (_, line) => (
        <Bar key={line} height={line === 0 ? 12 : 10} width={right ? 44 : line === 0 ? 120 : 160} />
      ))}
    </span>
  );
}

/** The figures above a list, labels known and values waiting. */
export function KpiGridSkeleton({ labels }: { labels: readonly string[] }): React.ReactElement {
  return (
    <div className="a-kpi-grid" aria-hidden="true">
      {labels.map((label) => (
        <div key={label} className="a-kpi">
          <div className="a-kpi-label">{label}</div>
          <Bar width={72} height={30} />
        </div>
      ))}
    </div>
  );
}

/** A row of header buttons, each the width of its label. */
export function ActionsSkeleton({ widths }: { widths: readonly number[] }): React.ReactElement {
  return (
    <>
      {widths.map((width, index) => (
        <Bar key={index} width={width} height={40} />
      ))}
    </>
  );
}
