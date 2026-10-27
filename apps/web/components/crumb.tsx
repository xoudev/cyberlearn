import React from "react";
import Link from "next/link";

export type CrumbSegment = string | { label: string; href?: string };

/**
 * The breadcrumb every page opens with: CyberLearn, then the segments, the
 * last one lit.
 *
 * It used to imitate a shell prompt (`$ ~/cyberlearn/…` with a blinking
 * caret), the old art direction's terminal voice; Bastion writes it as a
 * plain trail in the interface face. `caret` is still accepted so the pages
 * that pass it compile, and draws nothing.
 *
 * It was written out on seventeen pages, in style objects or in a stylesheet
 * of the page's own (.pc2-crumb, .pd2-crumb, .r-crumb, .chx-breadcrumb), and
 * no two were the same width or grey. One drawing, on the page header's
 * classes; a segment with an address is a link.
 */
export function Crumb({
  segments,
}: {
  segments: readonly CrumbSegment[];
  /** The blinking caret is gone: accepted, so its callers compile, and ignored. */
  caret?: boolean;
}): React.ReactElement {
  const last = segments.length - 1;
  return (
    <nav className="pg-crumb" aria-label="Fil d'Ariane">
      <b>CyberLearn</b>
      {segments.map((segment, index) => {
        const item = typeof segment === "string" ? { label: segment } : segment;
        const className = index === last ? "pg-crumb__leaf" : undefined;
        return (
          <React.Fragment key={`${String(index)}-${item.label}`}>
            <span className="pg-crumb__sep" aria-hidden="true">
              /
            </span>
            {item.href === undefined ? (
              <span className={className} aria-current={index === last ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className={className ?? "pg-crumb__link"}>
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
