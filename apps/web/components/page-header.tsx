import React from "react";
import { Crumb } from "./crumb";

/**
 * The chrome every page of the app opens with: a prompt-shaped breadcrumb, an
 * eyebrow, a title, and a line saying what the page is for.
 *
 * It was written inline on each page, forty lines of style objects at a time,
 * which is how the class page came to look like a different product - it was
 * written later and simply did not repeat them. Extracted so the next page
 * gets the pattern by using it rather than by remembering it.
 *
 * The breadcrumb is `Crumb`, which the pages with a header of their own use
 * too.
 */
export function PageHeader({
  crumb,
  eyebrow,
  title,
  lede,
}: {
  /** The last segment of the prompt, after ~/cyberlearn/. */
  crumb: string;
  eyebrow: React.ReactNode;
  title: string;
  lede?: React.ReactNode;
}): React.ReactElement {
  return (
    <header>
      <Crumb segments={[crumb]} />

      <div className="pg-eyebrow">{eyebrow}</div>
      <h1 className="pg-title">{title}</h1>
      {lede !== undefined && <p className="pg-lede">{lede}</p>}
    </header>
  );
}
