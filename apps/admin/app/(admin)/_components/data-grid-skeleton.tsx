import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import type { GridColumn } from "./data-grid";

/**
 * The loading state of a DataGrid, drawn from the same column list the page
 * passes to the grid: the headers are the real ones, in the real order, and
 * only the cells wait. A skeleton drawn by hand next to the page is how the
 * account list came to load as seven columns and render as ten.
 *
 * Every block is the shared Skeleton, square like the console. A block that
 * stands in for text is a span, so it fits in a <p> or a <th>.
 */

export function DataGridSkeleton({
  columns,
  facets = 0,
  search = true,
  toolbar,
  rows = 10,
  selectable = false,
  leadLines = 1,
}: {
  columns: readonly GridColumn[];
  /** How many filter menus the toolbar holds. */
  facets?: number;
  search?: boolean;
  /** Replaces the search box and the facets, as the grid's own toolbar prop does. */
  toolbar?: React.ReactNode;
  rows?: number;
  /** A checkbox column before the first. */
  selectable?: boolean;
  /** Lines in the first cell: a title with its reference under it is two. */
  leadLines?: number;
}): React.ReactElement {
  return (
    <section className="a-card" aria-hidden="true">
      <div className="a-toolbar">
        {toolbar ?? (
          <>
            {search && <Skeleton as="span" className="a-search" />}
            {Array.from({ length: facets }, (_, index) => (
              <Skeleton key={index} as="span" w={132} h={36} />
            ))}
          </>
        )}
        <span className="a-toolbar-count">
          <Skeleton as="span" w={84} h={11} />
        </span>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              {selectable && (
                <th className="a-check-cell">
                  <Skeleton as="span" w={16} h={16} />
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
                    <Skeleton as="span" w={16} h={16} />
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
        <Skeleton as="span" w={150} h={11} />
        <div className="a-pager-btns">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} as="span" w={30} h={30} />
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
        <Skeleton
          key={line}
          as="span"
          h={line === 0 ? 12 : 10}
          w={right ? 44 : line === 0 ? 120 : 160}
        />
      ))}
    </span>
  );
}

/**
 * The filters of a list whose toolbar is more than a search (the audit log):
 * each field under its label, then the submit button.
 */
export function FiltersSkeleton({ labels }: { labels: readonly string[] }): React.ReactElement {
  return (
    <div className="a-filters">
      {labels.map((label) => (
        <span key={label} className="a-filter">
          {label}
          <Skeleton as="span" w={150} h={36} />
        </span>
      ))}
      <span className="a-filter-actions">
        <Skeleton as="span" w={84} h={32} />
      </span>
    </div>
  );
}

/** The figures above a list, labels known and values waiting. */
export function KpiGridSkeleton({
  labels,
  className,
}: {
  labels: readonly string[];
  /** What the page adds to .a-kpi-grid, the sync page's tighter margin. */
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={className === undefined ? "a-kpi-grid" : `a-kpi-grid ${className}`}
      aria-hidden="true"
    >
      {labels.map((label) => (
        <div key={label} className="a-kpi">
          <div className="a-kpi-label">{label}</div>
          <Skeleton as="span" w={72} h={30} />
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
        <Skeleton key={index} as="span" w={width} h={40} />
      ))}
    </>
  );
}
