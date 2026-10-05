"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CHANGELOG_SEEN_KEY, hasUnseenChangelog } from "@/lib/changelog/entries";

/**
 * The release notes, as a button of the navbar.
 *
 * They used to be a small link under the account block of the sidebar, which
 * is where a thing goes to be overlooked. A release is news, and it is
 * announced where the other news arrives: next to the friends and the bell,
 * marked until the notes have been read once on this device.
 *
 * It starts quiet and turns fresh once storage says so, rather than the other
 * way round. The server knows nothing of what this device has read, so a
 * first paint that was marked would flash on every load for somebody who had
 * already read them.
 */
export function NewsButton(): React.JSX.Element {
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
    // The notes page broadcasts the read in this tab; another tab's read
    // arrives as a storage event.
    window.addEventListener("cl-changelog-seen", clear);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("cl-changelog-seen", clear);
      window.removeEventListener("storage", check);
    };
  }, []);

  return (
    <Link
      href="/changelog"
      className={`news-chip${fresh ? " news-chip--fresh" : ""}`}
      title="Les nouveautés du site"
      aria-label={fresh ? "Nouveautés, non lues" : "Nouveautés"}
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
    </Link>
  );
}
