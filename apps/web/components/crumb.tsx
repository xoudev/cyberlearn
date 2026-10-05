import React from "react";
import Link from "next/link";

export type CrumbSegment = string | { label: string; href?: string };

/**
 * The prompt-shaped breadcrumb every page opens with: `$ ~/cyberlearn/…`,
 * the last segment lit, a caret blinking after it.
 *
 * It was written out on seventeen pages, in style objects or in a stylesheet
 * of the page's own (.pc2-crumb, .pd2-crumb, .r-crumb, .chx-breadcrumb), and
 * no two were the same width or grey. One drawing, on the page header's
 * classes; a segment with an address is a link.
 */
export function Crumb({
  segments,
  caret = true,
}: {
  segments: readonly CrumbSegment[];
  caret?: boolean;
}): React.ReactElement {
  const last = segments.length - 1;
  return (
    <div className="pg-crumb">
      <span className="pg-crumb__sigil">$</span>
      <span>~/</span>
      <b>cyberlearn</b>
      {segments.map((segment, index) => {
        const item = typeof segment === "string" ? { label: segment } : segment;
        const className = index === last ? "pg-crumb__leaf" : undefined;
        return (
          <React.Fragment key={`${String(index)}-${item.label}`}>
            <span className="pg-crumb__sep">/</span>
            {item.href === undefined ? (
              <span className={className}>{item.label}</span>
            ) : (
              <Link href={item.href} className={className ?? "pg-crumb__link"}>
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
      {caret && <span className="pg-crumb__caret" aria-hidden="true" />}
    </div>
  );
}
