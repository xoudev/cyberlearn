import Link from "next/link";
import React from "react";
import type { WriteupBoard } from "@/lib/challenges/writeups";
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
    <section aria-label="Solutions" style={{ marginTop: 48, display: "grid", gap: 16 }}>
      <div
        className="mono-label"
        style={{
          color: "var(--cosmetic-accent)",
          fontWeight: 600,
          paddingBottom: 14,
          borderBottom: "1px dashed var(--color-border-subtle)",
        }}
      >
        {"// "}Solutions · {solutionsLabel(board.count)}
      </div>

      {!board.solved ? (
        <p className="card card--sunken" style={{ margin: 0, padding: "14px 16px", fontSize: 14 }}>
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
                : { content: board.own.content, isHidden: board.own.isHidden }
            }
          />
          {board.others.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
              Personne d&apos;autre n&apos;a encore publié sa solution.
            </p>
          ) : (
            <ul
              aria-label="Les solutions des autres"
              style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14 }}
            >
              {board.others.map((writeup) => (
                <li key={writeup.id} className="card" style={{ padding: "14px 18px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 8,
                      fontSize: 12.5,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span>
                      {writeup.author === null ? (
                        "Compte supprimé"
                      ) : writeup.author.username !== null ? (
                        <Link href={`/u/${writeup.author.username}`}>{writeup.author.name}</Link>
                      ) : (
                        writeup.author.name
                      )}
                    </span>
                    <span>{dayFormat.format(new Date(writeup.updatedAt))}</span>
                  </div>
                  <div
                    style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-text-secondary)" }}
                  >
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
