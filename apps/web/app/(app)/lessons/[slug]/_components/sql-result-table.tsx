import React from "react";
import type { SqlResult } from "@/lib/sql/sandbox";

/** At most this many rows are drawn: a SELECT * on a big table stays readable. */
const MAX_ROWS = 50;

/**
 * A query's result as a table, for the SQL exercises (SqlPlayground,
 * SqlInjectionLab). NULL is written as SQLite writes it, in grey.
 */
export function SqlResultTable({ result }: { result: SqlResult }): React.ReactElement {
  const shown = result.values.slice(0, MAX_ROWS);
  return (
    <div style={{ overflowX: "auto", border: "1px solid #1F1B47" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12.5,
        }}
      >
        <thead>
          <tr>
            {result.columns.map((column, i) => (
              <th
                key={`${column}-${String(i)}`}
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  borderBottom: "1px solid #2A2560",
                  color: "#7F7BA9",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={{
                    padding: "5px 10px",
                    borderBottom: "1px solid #14113A",
                    color: cell === null ? "#5A5680" : "#D8D6EA",
                    whiteSpace: "pre",
                  }}
                >
                  {cell === null ? "NULL" : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: 0, padding: "4px 10px", fontSize: 12, color: "#7F7BA9" }}>
        {result.values.length} ligne{result.values.length > 1 ? "s" : ""}
        {result.values.length > MAX_ROWS ? `, ${String(MAX_ROWS)} affichées` : ""}
      </p>
    </div>
  );
}

/** The tables a schema creates, read from its text: shown before SQLite has started. */
export function tablesOf(schema: string): { name: string; columns: string[] }[] {
  const tables: { name: string; columns: string[] }[] = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/giu;
  for (const m of schema.matchAll(re)) {
    const body = m[2] ?? "";
    const columns = body
      .split(",")
      .map((part) => part.trim().split(/\s+/u)[0] ?? "")
      .filter(
        (word) =>
          /^\w+$/u.test(word) && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/iu.test(word),
      );
    tables.push({ name: m[1] ?? "", columns });
  }
  return tables;
}
