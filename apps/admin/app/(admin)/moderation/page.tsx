import React from "react";
import type { Metadata } from "next";
import { isActionableEvent, moderationRepository } from "@cyberlearn/db";
import { Card, EmptyState, KpiCard, PageHeader, Tag, UI } from "../_components/admin-ui";
import { ReviewButtons } from "./_components/review-buttons";

export const metadata: Metadata = { title: "Modération" };
export const dynamic = "force-dynamic";

const SURFACE_LABEL: Record<string, string> = {
  "lesson.question": "Question sous une leçon",
  "lesson.answer": "Réponse sous une leçon",
  "note.share": "Note partagée",
  "forum.topic": "Sujet du forum",
  "forum.post": "Message du forum",
};

const RULE_LABEL: Record<string, string> = {
  slur: "Insulte discriminatoire",
  insult: "Insulte",
  threat: "Menace",
  sexual: "Contenu sexuel",
  "self-harm": "Détresse",
  vulgarity: "Grossièreté",
  "contact-details": "Coordonnées",
  "link-spam": "Liens",
  shouting: "Majuscules",
};

interface Finding {
  rule: string;
  severity: number;
  match: string;
}

/** findings is Json in the database, so it arrives as unknown and is narrowed. */
function readFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (f): f is Finding =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as Finding).rule === "string" &&
      typeof (f as Finding).match === "string",
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

/**
 * The queue, and the record of what was decided about it.
 *
 * Oldest first: a message that has waited longest is the one that is due, and a
 * newest-first queue is one where the backlog is never reached.
 *
 * Every row shows the text as it was written. A reviewer cannot say whether a
 * refusal was right without reading what was refused, and a summary of it -
 * "contains an insult" - is the machine's opinion restated rather than
 * evidence.
 */
export default async function AdminModerationPage(): Promise<React.ReactElement> {
  const [pending, resolved, counts] = await Promise.all([
    moderationRepository.listPending(100),
    moderationRepository.listResolved(30),
    moderationRepository.countsByOutcome(),
  ]);

  const overturned = counts.OVERTURNED ?? 0;
  const upheld = counts.UPHELD ?? 0;
  const judged = overturned + upheld;

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Sécurité"
        title="Modération"
        description="Ce que le filtre automatique a refusé ou signalé. Confirmer ou infirmer ne republie rien : ça dit si la règle est bonne."
      />

      <div className="a-kpi-grid">
        <KpiCard label="En attente" value={String(counts.PENDING ?? 0)} tone="warning" />
        <KpiCard label="Décisions confirmées" value={String(upheld)} tone="accent" />
        <KpiCard label="Faux positifs" value={String(overturned)} tone="danger" />
        <KpiCard
          label="Taux de faux positifs"
          value={judged === 0 ? "n.d." : `${String(Math.round((overturned / judged) * 100))}%`}
          tone="info"
        />
      </div>

      <Card title={`À traiter · ${String(pending.length)}`} pad>
        {pending.length === 0 ? (
          <EmptyState
            title="Rien à traiter"
            text="Le filtre n'a rien refusé ni signalé depuis la dernière revue."
          />
        ) : (
          <div className="a-mod-queue">
            {pending.map((event) => {
              const findings = readFindings(event.findings);
              return (
                <div key={event.id} className="a-mod-row">
                  <div className="a-mod-head">
                    <Tag tone={event.verdict === "BLOCK" ? "danger" : "warning"}>
                      {event.verdict === "BLOCK" ? "Refusé" : "Signalé"}
                    </Tag>
                    <span className="mono" style={{ fontSize: 11, color: UI.muted }}>
                      {SURFACE_LABEL[event.surface] ?? event.surface}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: UI.muted }}>
                      {event.user?.displayName ?? "compte supprimé"}
                      {event.user?.username !== null &&
                        event.user?.username !== undefined &&
                        ` (@${event.user.username})`}
                      {" · "}
                      {formatDate(event.createdAt)}
                      {" · "}
                      score {event.score}
                    </span>
                  </div>

                  {/* As written. A reviewer cannot judge a refusal without
                      reading what was refused. */}
                  <pre className="a-mod-excerpt">{event.excerpt}</pre>

                  <div className="a-mod-findings">
                    {findings.map((f, i) => (
                      <Tag key={`${f.rule}-${String(i)}`} tone="neutral">
                        {RULE_LABEL[f.rule] ?? f.rule} · {f.match}
                      </Tag>
                    ))}
                  </div>

                  <ReviewButtons
                    eventId={event.id}
                    actionable={isActionableEvent(event.surface, event.contentId)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {resolved.length > 0 && (
        <Card title="Déjà traité" pad>
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {resolved.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <span className="mono a-field-hint">{event.excerpt.slice(0, 90)}</span>
                    </td>
                    <td align="right">
                      <Tag tone={event.outcome === "OVERTURNED" ? "danger" : "neutral"}>
                        {event.outcome === "OVERTURNED" ? "Faux positif" : "Confirmé"}
                      </Tag>
                    </td>
                    <td align="right" className="mono" style={{ color: UI.muted, fontSize: 11 }}>
                      {event.reviewedBy?.displayName ?? "Compte supprimé"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
