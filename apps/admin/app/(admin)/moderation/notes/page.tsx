import React from "react";
import type { Metadata } from "next";
import { noteReportRepository, type ReportedNote } from "@cyberlearn/db";
import {
  NOTE_REPORT_REASON_KEYS,
  NOTE_REPORT_REASON_LABELS,
} from "@cyberlearn/lib/notes/report-reasons";
import { EmptyState, GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { resolveNoteReportsAction } from "./actions";

export const metadata: Metadata = { title: "Notes signalées" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

function ReportedNoteCard({ note }: { note: ReportedNote }): React.ReactElement {
  const counts = NOTE_REPORT_REASON_KEYS.map((key) => ({
    key,
    n: note.reports.filter((r) => r.reason === key).length,
  })).filter((c) => c.n > 0);
  const author =
    note.authorUsername !== null
      ? `@${note.authorUsername}`
      : (note.authorDisplayName ?? "compte supprimé");

  return (
    <section className="a-card">
      <div className="a-card-head a-report-head">
        <div className="a-report-title">
          <div className="a-report-meta">
            <span className="a-report-ref">
              {author} · {note.lessonTitle}
            </span>
            <Tag tone="warning">
              {note.reports.length} signalement{note.reports.length > 1 ? "s" : ""}
            </Tag>
            <Tag>
              encore partagée avec {note.shareCount} personne{note.shareCount > 1 ? "s" : ""}
            </Tag>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <form action={resolveNoteReportsAction}>
            <input type="hidden" name="noteId" value={note.noteId} />
            <input type="hidden" name="outcome" value="UNSHARED" />
            <button type="submit" className="a-btn a-btn--danger a-btn--sm">
              Retirer de tous les partages
            </button>
          </form>
          <form action={resolveNoteReportsAction}>
            <input type="hidden" name="noteId" value={note.noteId} />
            <input type="hidden" name="outcome" value="DISMISSED" />
            <button type="submit" className="a-btn a-btn--ghost a-btn--sm">
              Classer sans suite
            </button>
          </form>
        </div>
      </div>
      <div className="a-card-pad a-report-body">
        {/* Plain text on purpose: the note is read as written, not rendered. */}
        <pre
          className="a-report-quiz"
          style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", margin: 0 }}
        >
          {note.content.trim() === "" ? "(note vide)" : note.content}
        </pre>
        <div className="a-report-meta">
          {counts.map((c) => (
            <Tag key={c.key}>
              {NOTE_REPORT_REASON_LABELS[c.key]} × {c.n}
            </Tag>
          ))}
        </div>
        <ul className="a-report-list">
          {note.reports.map((r) => (
            <li key={r.id}>
              <span className="a-report-small">
                {DATE.format(r.createdAt)} ·{" "}
                {r.reporterUsername !== null ? `@${r.reporterUsername}` : "compte supprimé"} ·{" "}
                {NOTE_REPORT_REASON_LABELS[r.reason]}
              </span>
              {r.comment !== null ? <p>{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Notes their recipients reported. Kept out of the automatic moderation queue:
 * a report is a claim by one person, and nothing is held against the author
 * until somebody here has read the note.
 */
export default async function NoteReportsPage(): Promise<React.ReactElement> {
  const notes = await noteReportRepository.openByNote();
  const total = notes.reduce((n, g) => n + g.reports.length, 0);

  return (
    <main className="admin-page-content">
      <PageHeader
        eyebrow="Sécurité"
        title="Notes signalées"
        description={
          notes.length === 0
            ? "Les notes qu'un destinataire signale arrivent ici, avec la raison et son commentaire."
            : `${String(total)} signalement${total > 1 ? "s" : ""} ouvert${total > 1 ? "s" : ""} sur ${String(notes.length)} note${notes.length > 1 ? "s" : ""}, les plus signalées d'abord. « Retirer de tous les partages » reprend la note à tous ses destinataires ; son auteur la garde.`
        }
        actions={<GhostLink href="/moderation">Retour à la modération</GhostLink>}
      />
      {notes.length === 0 ? (
        <EmptyState title="Aucune note signalée" text="Rien à relire pour l'instant." />
      ) : (
        <div className="a-report-cards">
          {notes.map((n) => (
            <ReportedNoteCard key={n.noteId} note={n} />
          ))}
        </div>
      )}
    </main>
  );
}
