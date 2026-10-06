import React from "react";
import { BadgesSkeleton } from "./_components/badges-skeleton";

/**
 * The badges collection while it loads: the same skeleton the page's
 * `<Suspense>` shows, drawn on the collection's own layout and classes.
 */
export default function BadgesLoading(): React.ReactElement {
  return <BadgesSkeleton />;
}
