"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@cyberlearn/ui";
import { gridHref, sortValue } from "@/lib/grid-href";
import { EmptyState } from "./admin-ui";

/**
 * The console's data grid, in two modes.
 *
 * Client mode works over rows fully rendered by the server: search, facets,
 * sort and page live in the browser, over every row at once. It suits a list
 * that stays short (badges, challenges, classes).
 *
 * Server mode is for a list that does not: the page reads one page of rows
 * under the filters of its URL (?q=&role=&sort=&page=) and hands over that
 * page alone, with the count of everything the filters match. Every control
 * here changes the URL, and the server reads it again. A filtered list can
 * then be linked to, kept in a bookmark, and opened from the dashboard.
 *
 * Cells arrive as ReactNode in both modes, so the server keeps ownership of
 * formatting.
 */

export type SortDir = "asc" | "desc";

export interface GridColumn {
  label: string;
  align?: "left" | "right";
  /** Client mode: the column sorts on its value in each row's `sort`. */
  sortable?: boolean;
  /** Server mode: the name ?sort= gives this column. None, and it does not sort. */
  sortKey?: string;
}

export interface GridFacet {
  label: string;
  options: { value: string; label: string }[];
}

/** A facet of a server-driven list: a URL parameter, and its current value. */
export interface ServerGridFacet extends GridFacet {
  key: string;
  value: string | undefined;
}

/** A row as both modes draw it. */
export interface GridRowBase {
  id: string;
  cells: React.ReactNode[];
  /** What the row is called, for its checkbox when rows can be selected. */
  label?: string;
}

/** A row of a client-side grid: the raw values the browser filters and sorts on. */
export interface GridRow extends GridRowBase {
  /** Lower-cased haystack matched against the search query. */
  search: string;
  /** One raw value per column, used when that column is sorted. */
  sort: (string | number)[];
  /** One value per facet, matched against the facet selection. */
  facets?: string[];
}

export interface GridSort {
  key: string;
  dir: SortDir;
}

/** Where a server-driven list stands: its URL, and the page the server read. */
export interface ServerGrid {
  /** The list's path, "/users". */
  path: string;
  /**
   * The parameters the list understood, defaults left out: every link the
   * grid builds starts from these, so a value the server dropped as invalid
   * is not carried forward.
   */
  params: Readonly<Record<string, string>>;
  /** Rows the filters match, over every page. */
  total: number;
  /** The page shown, counted from 1. */
  page: number;
  pageSize: number;
  /** The sort the rows are in; none for the list's own order. */
  sort?: GridSort | undefined;
  /** The order the list has without ?sort=, which a click back to it drops from the URL. */
  defaultSort?: GridSort | undefined;
  /** The parameter the search box writes; null for a list with no search box. */
  searchKey?: string | null;
}

/** Rows ticked for a bulk action, owned by the page's own component. */
export interface GridSelection {
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

interface CommonProps {
  columns: readonly GridColumn[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyText?: string;
  /** Adds a checkbox to every row. */
  selection?: GridSelection;
  /** Between the toolbar and the table: where a bulk action bar goes. */
  banner?: React.ReactNode;
}

interface ClientGridProps extends CommonProps {
  rows: GridRow[];
  facets?: GridFacet[];
  pageSize?: number;
  server?: undefined;
}

interface ServerGridProps extends CommonProps {
  rows: GridRowBase[];
  facets?: ServerGridFacet[];
  server: ServerGrid;
  /** Replaces the search box and the facets, for a list whose filters are more than that. */
  toolbar?: React.ReactNode;
}

export function DataGrid(props: ClientGridProps | ServerGridProps): React.JSX.Element {
  return props.server === undefined ? <ClientDataGrid {...props} /> : <ServerDataGrid {...props} />;
}

// ─── Client mode ────────────────────────────────────────────────────────────

function ClientDataGrid({
  columns,
  rows,
  facets = [],
  searchPlaceholder = "Rechercher…",
  pageSize = 15,
  emptyTitle = "Aucun résultat",
  emptyText,
  selection,
  banner,
}: ClientGridProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [facetValues, setFacetValues] = useState<string[]>(() => facets.map(() => "all"));
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
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
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
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
            triggerStyle={FACET_TRIGGER}
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

      {banner}

      {visible.length === 0 ? (
        <EmptyState title={emptyTitle} text={emptyText} />
      ) : (
        <GridTable
          columns={columns}
          rows={visible}
          selection={selection}
          sortedAs={(column, index) =>
            column.sortable === true && sortIndex === index
              ? sortDir
              : column.sortable
                ? null
                : false
          }
          onSort={(_column, index) => {
            toggleSort(index);
          }}
        />
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
              aria-label="Page précédente"
              onClick={() => {
                setPage(safePage - 1);
              }}
            >
              ←
            </button>
            {pagerSlots(safePage + 1, pageCount).map((slot, index) =>
              slot === null ? (
                <span key={`gap-${String(index)}`} className="a-pager-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={slot}
                  type="button"
                  className="a-pager-btn"
                  data-current={slot === safePage + 1}
                  aria-current={slot === safePage + 1 ? "page" : undefined}
                  onClick={() => {
                    setPage(slot - 1);
                  }}
                >
                  {slot}
                </button>
              ),
            )}
            <button
              type="button"
              className="a-pager-btn"
              disabled={safePage === pageCount - 1}
              aria-label="Page suivante"
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

// ─── Server mode ────────────────────────────────────────────────────────────

/**
 * What a click on a column's header writes to ?sort=, null to clear it.
 *
 * Up the first time, then down. After that, a list with an order of its own
 * (lessons: drafts first, newest first) goes back to it, and one whose own
 * order is a column (accounts: newest first) goes up again. A sort that lands
 * on the list's own order leaves the URL, so a plain /users stays one link.
 */
export function nextSort(
  sortKey: string,
  current: GridSort | undefined,
  defaultSort: GridSort | undefined,
): string | null {
  let dir: SortDir = "asc";
  if (current?.key === sortKey) {
    if (current.dir === "asc") dir = "desc";
    else if (defaultSort === undefined) return null;
  }
  if (defaultSort?.key === sortKey && defaultSort.dir === dir) return null;
  return sortValue(sortKey, dir);
}

function ServerDataGrid({
  columns,
  rows,
  facets = [],
  searchPlaceholder = "Rechercher…",
  emptyTitle = "Aucun résultat",
  emptyText,
  selection,
  banner,
  server,
  toolbar,
}: ServerGridProps): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { path, params, total, page, pageSize } = server;
  const searchKey = server.searchKey === undefined ? "q" : server.searchKey;
  const sort = server.sort ?? server.defaultSort;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function navigate(changes: Record<string, string | null>): void {
    startTransition(() => {
      router.push(gridHref(path, params, changes), { scroll: false });
    });
  }

  const pageHref = (target: number): string =>
    gridHref(path, params, { page: target > 1 ? String(target) : null });

  // What "Réinitialiser" keeps: the sort, and any parameter that is not one
  // of the toolbar's filters.
  const filterKeys = new Set([...facets.map((facet) => facet.key), "page"]);
  if (searchKey !== null) filterKeys.add(searchKey);
  const filtered =
    (searchKey !== null && (params[searchKey] ?? "") !== "") ||
    facets.some((facet) => facet.value !== undefined);
  const resetHref = gridHref(
    path,
    Object.fromEntries(Object.entries(params).filter(([key]) => !filterKeys.has(key))),
  );

  return (
    <section className="a-card" aria-busy={pending} data-pending={pending}>
      <div className="a-toolbar">
        {toolbar ?? (
          <>
            {searchKey !== null && (
              <ServerSearch
                path={path}
                params={params}
                searchKey={searchKey}
                placeholder={searchPlaceholder}
                onSearch={(value) => {
                  navigate({ [searchKey]: value });
                }}
              />
            )}

            {facets.map((facet) => (
              <Select
                key={facet.key}
                block={false}
                triggerStyle={FACET_TRIGGER}
                aria-label={facet.label}
                value={facet.value ?? "all"}
                options={[{ value: "all", label: `${facet.label} : tous` }, ...facet.options]}
                onChange={(next) => {
                  navigate({ [facet.key]: next === "all" ? null : next });
                }}
              />
            ))}

            {filtered && (
              <Link href={resetHref} className="a-toolbar-reset" scroll={false}>
                Réinitialiser
              </Link>
            )}
          </>
        )}

        <span className="a-toolbar-count" aria-live="polite">
          {total.toLocaleString("fr-FR")} résultat{total !== 1 ? "s" : ""}
        </span>
      </div>

      {banner}

      {rows.length === 0 ? (
        // An empty filter says so, and offers the way back; an empty list
        // keeps the page's own words.
        filtered ? (
          <EmptyState
            title="Aucun résultat"
            text="Rien ne correspond à ces filtres."
            action={
              <Link href={resetHref} className="a-btn a-btn--ghost a-btn--sm">
                Effacer les filtres
              </Link>
            }
          />
        ) : (
          <EmptyState title={emptyTitle} text={emptyText} />
        )
      ) : (
        <GridTable
          columns={columns}
          rows={rows}
          selection={selection}
          sortedAs={(column) =>
            column.sortKey === undefined ? false : sort?.key === column.sortKey ? sort.dir : null
          }
          onSort={(column) => {
            if (column.sortKey === undefined) return;
            navigate({ sort: nextSort(column.sortKey, sort, server.defaultSort) });
          }}
        />
      )}

      {pageCount > 1 && (
        <nav className="a-pager" aria-label="Pagination">
          <span>
            Page {page} / {pageCount} · {total.toLocaleString("fr-FR")} ligne
            {total !== 1 ? "s" : ""}
          </span>
          <div className="a-pager-btns">
            <PagerLink href={page > 1 ? pageHref(page - 1) : null} label="Page précédente">
              ←
            </PagerLink>
            {pagerSlots(page, pageCount).map((slot, index) =>
              slot === null ? (
                <span key={`gap-${String(index)}`} className="a-pager-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <Link
                  key={slot}
                  href={pageHref(slot)}
                  className="a-pager-btn"
                  data-current={slot === page}
                  aria-current={slot === page ? "page" : undefined}
                >
                  {slot}
                </Link>
              ),
            )}
            <PagerLink href={page < pageCount ? pageHref(page + 1) : null} label="Page suivante">
              →
            </PagerLink>
          </div>
        </nav>
      )}
    </section>
  );
}

/**
 * The search box of a server-driven list: a GET form, so it still works as a
 * plain form, and a navigation through the router when scripts run.
 */
function ServerSearch({
  path,
  params,
  searchKey,
  placeholder,
  onSearch,
}: {
  path: string;
  params: Readonly<Record<string, string>>;
  searchKey: string;
  placeholder: string;
  onSearch: (value: string) => void;
}): React.JSX.Element {
  const fromUrl = params[searchKey] ?? "";
  const [value, setValue] = useState(fromUrl);
  // The URL can change under the box (a reset, the back button): follow it,
  // without remounting the input and losing the caret.
  const [seen, setSeen] = useState(fromUrl);
  if (seen !== fromUrl) {
    setSeen(fromUrl);
    setValue(fromUrl);
  }

  return (
    <form
      role="search"
      className="a-search"
      action={path}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <SearchIcon />
      <input
        type="search"
        name={searchKey}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      {/* Without scripts the form submits itself: the other filters ride along. */}
      {Object.entries(params)
        .filter(([key]) => key !== searchKey && key !== "page")
        .map(([key, val]) => (
          <input key={key} type="hidden" name={key} value={val} />
        ))}
    </form>
  );
}

function PagerLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  if (href === null) {
    return (
      <span className="a-pager-btn" aria-disabled="true" data-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="a-pager-btn" aria-label={label}>
      {children}
    </Link>
  );
}

// ─── Shared ─────────────────────────────────────────────────────────────────

const FACET_TRIGGER: React.CSSProperties = { height: 36, fontSize: 11, padding: "0 10px" };

/**
 * The page numbers a pager shows: the first, the last, and the current one
 * with its neighbours; null marks a gap.
 */
export function pagerSlots(current: number, count: number): (number | null)[] {
  const slots: (number | null)[] = [];
  for (let n = 1; n <= count; n++) {
    if (n === 1 || n === count || Math.abs(n - current) <= 1) {
      const last = slots.at(-1);
      if (typeof last === "number" && last !== n - 1) slots.push(null);
      slots.push(n);
    }
  }
  return slots;
}

function ariaSort(dir: SortDir): "ascending" | "descending" {
  return dir === "asc" ? "ascending" : "descending";
}

/**
 * The table both modes draw. A sortable header holds a real button: it takes
 * the focus, answers Enter and Space, and the header cell says how the column
 * is sorted (aria-sort), which a click handler on a <th> did not.
 */
function GridTable({
  columns,
  rows,
  selection,
  sortedAs,
  onSort,
}: {
  columns: readonly GridColumn[];
  rows: GridRowBase[];
  selection: GridSelection | undefined;
  /** The column's direction when sorted, null when it can be, false when it cannot. */
  sortedAs: (column: GridColumn, index: number) => SortDir | null | false;
  onSort: (column: GridColumn, index: number) => void;
}): React.JSX.Element {
  const ids = rows.map((row) => row.id);
  const ticked =
    selection === undefined ? 0 : ids.filter((id) => selection.selected.has(id)).length;

  function toggleAll(): void {
    if (selection === undefined) return;
    const next = new Set(selection.selected);
    if (ticked === ids.length) for (const id of ids) next.delete(id);
    else for (const id of ids) next.add(id);
    selection.onChange(next);
  }

  function toggleOne(id: string): void {
    if (selection === undefined) return;
    const next = new Set(selection.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  }

  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            {selection !== undefined && (
              <th className="a-check-cell">
                <Checkbox
                  checked={ids.length > 0 && ticked === ids.length}
                  mixed={ticked > 0 && ticked < ids.length}
                  label="Sélectionner toutes les lignes de cette page"
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((column, index) => {
              const state = sortedAs(column, index);
              return (
                <th
                  key={column.label}
                  scope="col"
                  style={column.align === "right" ? { textAlign: "right" } : undefined}
                  aria-sort={state === false || state === null ? undefined : ariaSort(state)}
                >
                  {state === false ? (
                    column.label
                  ) : (
                    <button
                      type="button"
                      className="a-th-sort"
                      onClick={() => {
                        onSort(column, index);
                      }}
                    >
                      {column.label}
                      <span className="a-sort" aria-hidden="true">
                        {state === "asc" ? "↑" : state === "desc" ? "↓" : "↕"}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isTicked = selection?.selected.has(row.id) ?? false;
            return (
              <tr key={row.id} data-selected={isTicked || undefined}>
                {selection !== undefined && (
                  <td className="a-check-cell">
                    <Checkbox
                      checked={isTicked}
                      label={`Sélectionner « ${row.label ?? row.id} »`}
                      onChange={() => {
                        toggleOne(row.id);
                      }}
                    />
                  </td>
                )}
                {row.cells.map((cell, index) => (
                  <td key={index} className={columns[index]?.align === "right" ? "num" : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A native checkbox in the console's square skin, with the "some" state a header needs. */
function Checkbox({
  checked,
  mixed = false,
  label,
  onChange,
}: {
  checked: boolean;
  mixed?: boolean;
  label: string;
  onChange: () => void;
}): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  // indeterminate is a property, not an attribute: React cannot render it.
  useEffect(() => {
    if (ref.current !== null) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="a-check"
      checked={checked}
      aria-label={label}
      onChange={onChange}
    />
  );
}

function SearchIcon(): React.JSX.Element {
  return (
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
  );
}
