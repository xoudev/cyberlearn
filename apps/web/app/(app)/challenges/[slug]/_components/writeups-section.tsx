import Link from "next/link";
import React from "react";
import type { WriteupBoard } from "@/lib/challenges/writeups";
import { FriendMark } from "@/components/friend-mark";
import { ReportContentButton } from "@/components/report-content-dialog";
import { renderNoteMarkdown } from "@/lib/markdown/render-note";
import { WriteupEditor } from "./writeup-editor";

/**
 * The write-ups of a challenge, under it: the count only while the reader is
 * still looking (a write-up is the answer), then their own solution to write
 * and the others' to read. Server-rendered; the editor is the only client
 * part.
 */

function solutionsLabel(count: number): string {
  return `${String(count)} solution${count > 1 ? "s" : ""} publiée${count > 1 ? "s" : ""}`;
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function WriteupsSection({
  challengeId,
  board,
}: {
  challengeId: string;
  board: WriteupBoard;
}): React.ReactElement {
  return (
    <section className="challenge-solutions" aria-label="Solutions">
      <div className="challenge-section-head">
        <h2>Solutions</h2>
        <span>{solutionsLabel(board.count)}</span>
      </div>

      {!board.solved ? (
        <p className="card challenge-solutions__locked">
          Les solutions des autres s&apos;ouvrent quand tu as résolu le défi : une solution,
          c&apos;est la réponse. Une fois le flag trouvé, tu pourras aussi publier la tienne.
        </p>
      ) : (
        <>
          <WriteupEditor
            challengeId={challengeId}
            initial={
              board.own === null
                ? null
                : {
                    content: board.own.content,
                    isHidden: board.own.isHidden,
                    hiddenByModeration: board.own.hiddenByModeration,
                  }
            }
          />
          {board.others.length === 0 ? (
            <p className="challenge-solutions__none">
              Personne d&apos;autre n&apos;a encore publié sa solution.
            </p>
          ) : (
            <ul aria-label="Les solutions des autres" className="challenge-solutions__list">
              {board.others.map((writeup) => (
                <li key={writeup.id} className="card">
                  <div className="challenge-solutions__meta">
                    <span>
                      {writeup.author === null ? (
                        "Compte supprimé"
                      ) : writeup.author.username !== null ? (
                        <Link href={`/u/${writeup.author.username}`}>{writeup.author.name}</Link>
                      ) : (
                        writeup.author.name
                      )}
                      {writeup.author?.isFriend === true && <FriendMark size={12} />}
                    </span>
                    <span className="challenge-solutions__when">
                      {dayFormat.format(new Date(writeup.updatedAt))}
                      {/* The others' only: the reader's own is in the editor above. */}
                      <ReportContentButton surface="CHALLENGE_WRITEUP" contentId={writeup.id} />
                    </span>
                  </div>
                  <div className="challenge-solutions__text">
                    {renderNoteMarkdown(writeup.content)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
