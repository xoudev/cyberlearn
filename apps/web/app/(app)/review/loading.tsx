import React from "react";
import RevisionsLoading from "../revisions/loading";

/**
 * /review only redirects to /revisions, so while it resolves it shows the
 * revisions page's skeleton: the page the reader is about to land on.
 */
export default function ReviewLoading(): React.ReactElement {
  return <RevisionsLoading />;
}
