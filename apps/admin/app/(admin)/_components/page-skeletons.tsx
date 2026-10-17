import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import type { GridColumn } from "./data-grid";

/**
 * The pieces a console page's loading state is built from, besides its grid
 * (data-grid-skeleton.tsx). They draw on the classes the real page uses
 * (.a-field, .a-defrow, .a-feed...), so a skeleton takes the page's shape and
 * spacing, and only what the server has not sent yet shimmers.
 */

/** A title the server has to read first (a badge's name): about one line of .a-h1. */
export function TitleSkeleton({ width = 280 }: { width?: number }): React.ReactElement {
  return <Skeleton as="span" w={width} h="0.9em" />;
}

/** A line of text waiting: a description, a figure, a reference. */
export function LineSkeleton({
  width,
  height = 13,
}: {
  width: number | string;
  height?: number;
}): React.ReactElement {
  return <Skeleton as="span" w={width} h={height} />;
}

/** The height .a-input gives a field. */
const FIELD_HEIGHT = 46;

/**
 * One row of a form: that many fields side by side, or a single block of
 * that height (a textarea, the MDX editor).
 */
export type FormRow = number | { height: number };

const LABEL_WIDTHS = [72, 110, 56, 94, 128, 64] as const;

/** Labels of uneven lengths, as real ones are. */
function labelWidth(index: number): number {
  return LABEL_WIDTHS[index % LABEL_WIDTHS.length] ?? 80;
}

function FieldSkeleton({
  height = FIELD_HEIGHT,
  index,
}: {
  height?: number;
  index: number;
}): React.ReactElement {
  return (
    <div className="a-field">
      <span className="a-label">
        <Skeleton as="span" w={labelWidth(index)} h={10} />
      </span>
      <Skeleton h={height} />
    </div>
  );
}

/**
 * A form while it loads: labels and fields, never a grid. Rows of two follow
 * .admin-form-grid-2, the forms' own two-column grid; wider rows wrap.
 */
export function FormSkeleton({
  rows,
  submit = 160,
}: {
  rows: readonly FormRow[];
  /** The width of the submit button; 0 for a form that has none at the end. */
  submit?: number;
}): React.ReactElement {
  return (
    <div className="a-form" aria-hidden="true">
      {rows.map((row, index) => {
        if (typeof row !== "number") {
          return <FieldSkeleton key={index} height={row.height} index={index} />;
        }
        if (row === 1) return <FieldSkeleton key={index} index={index} />;
        return (
          <div
            key={index}
            className={row === 2 ? "admin-form-grid-2" : undefined}
            style={
              row === 2
                ? undefined
                : {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 16,
                  }
            }
          >
            {Array.from({ length: row }, (_, column) => (
              <FieldSkeleton key={column} index={index + column} />
            ))}
          </div>
        );
      })}
      {submit > 0 && <Skeleton w={submit} h={40} />}
    </div>
  );
}

/** Label-and-value rows (.a-defrow), as the settings and an account's card list them. */
export function DefRowsSkeleton({ count }: { count: number }): React.ReactElement {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="a-defrow" aria-hidden="true">
          <Skeleton as="span" w={labelWidth(index) + 60} h={11} />
          <Skeleton as="span" w={64} h={18} />
        </div>
      ))}
    </>
  );
}

/** An activity feed (.a-feed): a dot on its rail, two lines, a time. */
export function FeedSkeleton({ items }: { items: number }): React.ReactElement {
  return (
    <div className="a-feed" aria-hidden="true">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="a-feed-item">
          <span className="a-feed-rail">
            <Skeleton as="span" w={7} h={7} radius="circle" />
            <span className="a-feed-line" />
          </span>
          <div className="a-feed-body">
            <Skeleton as="span" w="70%" h={12} />
            <div className="a-feed-meta">
              <Skeleton as="span" w="40%" h={10} />
            </div>
          </div>
          <span className="a-feed-time">
            <Skeleton as="span" w={44} h={10} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A plain table inside a card: the real headers when the page has them as
 * constants, rows waiting under them. No headers, and it is rows alone.
 */
export function TableSkeleton({
  columns,
  rows,
}: {
  columns: readonly GridColumn[] | number;
  rows: number;
}): React.ReactElement {
  const cells: readonly GridColumn[] =
    typeof columns === "number"
      ? Array.from({ length: columns }, (_, index) => ({
          label: String(index),
          align: index === columns - 1 && columns > 1 ? "right" : "left",
        }))
      : columns;
  return (
    <div className="a-table-wrap" aria-hidden="true">
      <table className="a-table">
        {typeof columns !== "number" && (
          <thead>
            <tr>
              {cells.map((column) => (
                <th
                  key={column.label}
                  style={column.align === "right" ? { textAlign: "right" } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {cells.map((column, index) => (
                <td
                  key={column.label}
                  style={column.align === "right" ? { textAlign: "right" } : undefined}
                >
                  <Skeleton as="span" w={index === 0 ? 140 : 64} h={12} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Cards down the page whose head is a title over a reference, with a body of
 * text (a reported question, a reported note).
 */
export function ReportCardsSkeleton({ cards }: { cards: number }): React.ReactElement {
  return (
    <div className="a-report-cards" aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => (
        <section key={index} className="a-card">
          <div className="a-card-head a-report-head">
            <div className="a-report-title">
              <Skeleton as="span" w={180} h={10} />
              <Skeleton as="span" w={260} h={15} />
            </div>
            <Skeleton as="span" w={150} h={32} />
          </div>
          <div className="a-card-pad">
            <div className="a-stack-tight">
              <Skeleton as="span" w="85%" h={13} />
              <Skeleton as="span" w="60%" h={13} />
              <Skeleton as="span" w="70%" h={13} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
