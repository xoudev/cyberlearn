import React from "react";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

/**
 * The dashboard while it loads: the same skeleton the page's `<Suspense>`
 * shows, drawn on the page's own `.dash-*` classes.
 */
export default function DashboardLoading(): React.ReactElement {
  return <DashboardSkeleton />;
}
