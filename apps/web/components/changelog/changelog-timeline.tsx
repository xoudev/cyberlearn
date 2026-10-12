import React from "react";
import { CHANGE_META, formatChangelogDate, type ChangelogEntry } from "@/lib/changelog/entries";

/**
 * The release notes, newest first: a timeline of the versions, each with its
 * date, its title and its changes marked Nouveau, Amélioration or Correctif.
 *
 * It was the /changelog page. The notes are read beside the page the reader
 * was on now, in the news drawer (news-drawer.tsx), and this is what the
 * drawer draws: the one rendering of the list on the site. Its classes live
 * in globals.css, next to the navbar's button that opens it.
 */
export function ChangelogTimeline({
  entries,
}: {
  entries: readonly ChangelogEntry[];
}): React.JSX.Element {
  return (
    <div className="news-log">
      <p className="news-log__lede">
        Chaque amélioration, nouveauté et correctif apporté à CyberLearn, de la version la plus
        récente à la plus ancienne.
      </p>
      <ol className="news-log__list">
        {entries.map((entry, i) => (
          <EntryItem key={entry.version} entry={entry} isLatest={i === 0} />
        ))}
      </ol>
    </div>
  );
}

function EntryItem({
  entry,
  isLatest,
}: {
  entry: ChangelogEntry;
  isLatest: boolean;
}): React.JSX.Element {
  return (
    <li className="news-entry" data-latest={isLatest}>
      <span className="news-entry__node" aria-hidden="true" />
      <div className="news-entry__head">
        <span className="news-entry__version">v{entry.version}</span>
        {isLatest && <span className="news-entry__latest">Dernière version</span>}
        <time className="news-entry__date" dateTime={entry.date}>
          {formatChangelogDate(entry.date)}
        </time>
      </div>
      <h2 className="news-entry__title">{entry.title}</h2>
      <ul className="news-entry__changes">
        {entry.changes.map((change, i) => {
          const meta = CHANGE_META[change.type];
          return (
            <li key={i} className="news-change">
              <span
                className="news-change__type"
                style={{
                  color: meta.color,
                  background: meta.bg,
                  borderColor: `color-mix(in srgb, ${meta.color} 25%, transparent)`,
                }}
              >
                {meta.label}
              </span>
              <span className="news-change__text">{change.text}</span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
