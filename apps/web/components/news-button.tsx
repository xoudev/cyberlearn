"use client";

// "use client" justification: whether the notes have been read is known to
// this device only, and the button opens them over the page, in the browser.

import React, { useEffect, useState } from "react";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { CHANGELOG_SEEN_KEY, hasUnseenChangelog } from "@/lib/changelog/entries";
import { CHANGELOG_SEEN_EVENT } from "./changelog/mark-seen";
import { NEWS_QUERY } from "./changelog/news-query";

/**
 * The release notes, as a button of the navbar.
 *
 * They used to be a small link under the account block of the sidebar, which
 * is where a thing goes to be overlooked. A release is news, and it is
 * announced where the other news arrives: next to the friends and the bell,
 * marked until the notes have been read once on this device. It opens them in
 * a drawer over the page (changelog/news-drawer.tsx), wherever the reader is,
 * rather than on a page of their own that took the reader away from theirs.
 *
 * It starts quiet and turns fresh once storage says so, rather than the other
 * way round. The server knows nothing of what this device has read, so a
 * first paint that was marked would flash on every load for somebody who had
 * already read them.
 */
export function NewsButton(): React.JSX.Element {
  const news = useQueryDialog(NEWS_QUERY);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const check = (): void => {
      try {
        setFresh(hasUnseenChangelog(localStorage.getItem(CHANGELOG_SEEN_KEY)));
      } catch {
        setFresh(false);
      }
    };
    check();
    const clear = (): void => {
      setFresh(false);
    };
    // The drawer broadcasts the read in this tab; another tab's read arrives
    // as a storage event.
    window.addEventListener(CHANGELOG_SEEN_EVENT, clear);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(CHANGELOG_SEEN_EVENT, clear);
      window.removeEventListener("storage", check);
    };
  }, []);

  return (
    <button
      type="button"
      className={`news-chip${fresh ? " news-chip--fresh" : ""}`}
      title="Les nouveautés du site"
      aria-label={fresh ? "Nouveautés, non lues" : "Nouveautés"}
      aria-haspopup="dialog"
      onClick={() => {
        news.open();
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 6.5L9 4v8l-6.5-2.5z" />
        <path d="M9 4l4-1.5v11L9 12" />
        <path d="M4 9.5v3h2" />
      </svg>
      <span className="news-chip__label">Nouveautés</span>
      {fresh && <span className="news-chip__dot" aria-hidden="true" />}
    </button>
  );
}
