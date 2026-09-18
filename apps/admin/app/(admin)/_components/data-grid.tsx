"use client";

import React, { useMemo, useState } from "react";
import { Select } from "@cyberlearn/ui";
import { EmptyState } from "./admin-ui";

/**
 * Interactive data grid: client-side search, faceted filters, column sorting
 * and pagination over rows fully rendered by the server. Cells arrive as
 * ReactNode so the server keeps ownership of formatting; `search`, `sort`
 * and `facets` carry the raw values the interactions work on.
 */

export interface GridColumn {
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
}

export interface GridFacet {
  label: string;
  options: { value: string; label: string }[];
}

export interface GridRow {
  id: string;
  /** Lower-cased haystack matched against the search query. */
  search: string;
  /** One raw value per column, used when that column is sorted. */
  sort: (string | number)[];
  /** One value per facet, matched against the facet selection. */
  facets?: string[];
  cells: React.ReactNode[];
}

export function DataGrid({
  columns,
  rows,
  facets = [],
  searchPlaceholder = "Rechercher…",
  pageSize = 15,
  emptyTitle = "Aucun résultat",
  emptyText,
}: {
  columns: GridColumn[];
  rows: GridRow[];
  facets?: GridFacet[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyText?: string;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [facetValues, setFacetValues] = useState<string[]>(() => facets.map(() => "all"));
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = rows;
    if (q) result = result.filter((row) => row.search.includes(q));
    facetValues.forEach((value, index) => {
      if (value !== "all") result = result.filter((row) => row.facets?.[index] === value);
    });
    if (sortIndex !== null) {
      const dir = sortDir === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => {
        const av = a.sort[sortIndex] ?? "";
        const bv = b.sort[sortIndex] ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv), "fr") * dir;
      });
    }
    return result;
  }, [rows, query, facetValues, sortIndex, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function toggleSort(index: number): void {
    if (sortIndex === index) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortIndex(index);
      setSortDir("asc");
    }
    setPage(0);
  }

  return (
    <section className="a-card">
      <div className="a-toolbar">
        <label className="a-search">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L14 14" />
          </svg>
          <input
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>

        {facets.map((facet, index) => (
          <Select
            key={facet.label}
            block={false}
            triggerStyle={{ height: 36, fontSize: 11, padding: "0 10px" }}
            aria-label={facet.label}
            value={facetValues[index] ?? "all"}
            options={[{ value: "all", label: `${facet.label} : tous` }, ...facet.options]}
            onChange={(next) => {
              setFacetValues((prev) => prev.map((v, i) => (i === index ? next : v)));
              setPage(0);
            }}
          />
        ))}

        <span className="a-toolbar-count">
          {filtered.length}/{rows.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={emptyTitle} text={emptyText} />
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.label}
                    className={column.sortable ? "is-sortable" : undefined}
                    style={column.align === "right" ? { textAlign: "right" } : undefined}
                    onClick={
                      column.sortable
                        ? () => {
                            toggleSort(index);
                          }
                        : undefined
                    }
                    aria-sort={
                      sortIndex === index
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.label}
                    {sortIndex === index && (
                      <span className="a-sort" aria-hidden="true">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td
                      key={index}
                      className={columns[index]?.align === "right" ? "num" : undefined}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="a-pager">
          <span>
            Page {safePage + 1} / {pageCount} · {filtered.length} ligne
            {filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="a-pager-btns">
            <button
              type="button"
              className="a-pager-btn"
              disabled={safePage === 0}
              onClick={() => {
                setPage(safePage - 1);
              }}
            >
              ←
            </button>
            {Array.from({ length: pageCount }, (_, i) => i)
              .filter((i) => i === 0 || i === pageCount - 1 || Math.abs(i - safePage) <= 1)
              .map((i, idx, arr) => (
                <React.Fragment key={i}>
                  {idx > 0 && arr[idx - 1] !== i - 1 && (
                    <span className="a-pager-btn" style={{ border: "none" }}>
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    className="a-pager-btn"
                    data-current={i === safePage}
                    onClick={() => {
                      setPage(i);
                    }}
                  >
                    {i + 1}
                  </button>
                </React.Fragment>
              ))}
            <button
              type="button"
              className="a-pager-btn"
              disabled={safePage === pageCount - 1}
              onClick={() => {
                setPage(safePage + 1);
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
