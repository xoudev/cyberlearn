"use client";

// "use client" justification: the tabs filter the list in place, and the
// week's countdown ticks (weekly-countdown.tsx).

import React, { useState } from "react";
import Link from "next/link";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { Crumb } from "@/components/crumb";
import { EmptyState } from "@/components/empty-state";
import { Tabs, type TabItem } from "@/components/tabs";
import type { ChallengeItem, DisplayStatus, WeeklyChallenge } from "@/lib/challenges/catalogue";
import { WeeklyCountdown } from "./weekly-countdown";
import "./challenges.css";

// Defined with the data that fills them (lib/challenges/catalogue.ts), where
// the app's routes read them too.
export type { ChallengeItem, DisplayStatus };

interface Props {
  items: ChallengeItem[];
  weekly: WeeklyChallenge | null;
  /** The server's clock when it built the page, for the countdown's first paint. */
  nowMs: number;
}

// ── Words ─────────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ChallengeItem["type"], string> = {
  CTF: "CTF",
  PUZZLE: "Puzzle",
  LAB: "Lab",
  SCRIPT: "Script",
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  COMPLETED: "Résolu",
  IN_PROGRESS: "En cours",
  AVAILABLE: "Disponible",
  LOCKED: "Verrouillé",
};

/** What the learner hands in: a flag, or the challenge marked done on trust. */
function answerOf(type: ChallengeItem["type"]): string {
  return type === "CTF" || type === "SCRIPT" ? "Un flag" : "Le défi, marqué fait";
}

function timeOf(minutes: number): string {
  return minutes > 0 ? `${String(minutes)} min` : "Libre";
}

function attemptsLeft(item: ChallengeItem): number {
  return Math.max(0, item.maxAttempts - item.userAttempts);
}

function plural(n: number, word: string): string {
  return `${word}${n > 1 ? "s" : ""}`;
}

function href(slug: string): string {
  return `/challenges/${slug}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCheck(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

function IconLock(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DisplayStatus }): React.JSX.Element {
  return (
    <span className="dfx-badge" data-status={status}>
      {status === "COMPLETED" && <IconCheck />}
      {status === "LOCKED" && <IconLock />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** A locked challenge's evidence: its shape, not its content. */
function Redacted({ rows }: { rows: number }): React.JSX.Element {
  const widths = ["92%", "64%", "78%", "48%", "70%"];
  return (
    <div className="dfx-redacted" role="img" aria-label="Contenu verrouillé">
      {widths.slice(0, rows).map((width) => (
        <span key={width} style={{ width }} />
      ))}
    </div>
  );
}

function hasListing(item: ChallengeItem): boolean {
  return (item.evidence?.listing.length ?? 0) > 0;
}

/** The machine as `ls` shows it, the commands at a prompt, a caret after. */
function Listing({ item }: { item: ChallengeItem }): React.JSX.Element {
  const listing = item.evidence?.listing ?? [];
  return (
    <pre className="dfx-term">
      {listing.map((line, index) =>
        line.kind === "cmd" ? (
          <span key={`${String(index)}-cmd`} className="dfx-term__cmd">
            <span className="dfx-term__p" aria-hidden="true">
              $
            </span>
            {line.text}
            {"\n"}
          </span>
        ) : (
          <span key={`${String(index)}-out`}>
            {line.text}
            {"\n"}
          </span>
        ),
      )}
      <span className="dfx-term__p" aria-hidden="true">
        $
      </span>
      <span className="dfx-term__caret" aria-hidden="true" />
    </pre>
  );
}

/** The top of a card: the first lines of the challenge's main file, or its listing. */
function Peek({ item }: { item: ChallengeItem }): React.JSX.Element {
  if (item.displayStatus === "LOCKED") return <Redacted rows={3} />;
  const excerpt = item.evidence?.excerpt ?? null;
  if (excerpt !== null) {
    return (
      <>
        <ul className="dfx-card__lines">
          {excerpt.lines.map((line, index) => (
            <li key={`${String(index)}-${line}`} title={line}>
              {line}
            </li>
          ))}
        </ul>
        <span className="dfx-card__file">{excerpt.file}</span>
      </>
    );
  }
  if (hasListing(item)) return <Listing item={item} />;
  return <p className="dfx-card__file">{item.supplied}</p>;
}

// ── The week's challenge ──────────────────────────────────────────────────────

function WeekAction({ item }: { item: ChallengeItem }): React.JSX.Element {
  switch (item.displayStatus) {
    case "COMPLETED":
      return (
        <Link href={href(item.slug)} className="btn btn--ghost btn--lg">
          Revoir le défi <span aria-hidden="true">→</span>
        </Link>
      );
    case "IN_PROGRESS":
      return (
        <Link href={href(item.slug)} className="btn btn--danger btn--lg">
          Reprendre le défi <span aria-hidden="true">→</span>
        </Link>
      );
    case "LOCKED":
      return item.prerequisiteSlug !== null && item.lockedByTitle !== null ? (
        <Link href={href(item.prerequisiteSlug)} className="btn btn--danger btn--ghost btn--lg">
          Termine d&apos;abord « {item.lockedByTitle} » <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="btn btn--ghost btn--lg" aria-disabled="true">
          Verrouillé
        </span>
      );
    case "AVAILABLE":
      return (
        <Link href={href(item.slug)} className="btn btn--danger btn--lg">
          Relever le défi <span aria-hidden="true">→</span>
        </Link>
      );
  }
}

function WeekPanel({
  item,
  weekly,
  nowMs,
}: {
  item: ChallengeItem;
  weekly: WeeklyChallenge;
  nowMs: number;
}): React.JSX.Element {
  const diff = difficultyMeta(item.difficulty);
  const solved = item.displayStatus === "COMPLETED";
  const left = attemptsLeft(item);
  return (
    <section className="dfx-week" aria-labelledby="dfx-week-title">
      <div className="dfx-week__main">
        <p className="dfx-eyebrow">
          <b>Défi de la semaine</b>
          <span>{item.refCode}</span>
        </p>
        <h2 id="dfx-week-title" className="dfx-week__title">
          {item.title}
        </h2>
        <p className="dfx-week__desc">{item.description}</p>
        <div className="dfx-tags">
          <span className="dfx-tag" data-cat={item.category}>
            {categoryMeta(item.category).short}
          </span>
          <span className="dfx-tag">{diff.label}</span>
          <span className="dfx-tag">{TYPE_LABEL[item.type]}</span>
          {item.displayStatus !== "AVAILABLE" && <StatusBadge status={item.displayStatus} />}
        </div>
        <div className="dfx-week__cta">
          <WeekAction item={item} />
          <WeeklyCountdown
            endsAt={weekly.endsAt}
            nowMs={nowMs}
            prefix={solved ? "Prochain défi dans" : `XP ×${String(weekly.multiplier)} encore`}
          />
        </div>
      </div>

      <div className="dfx-week__side">
        <div className="dfx-week__side-head">
          <span>Pièce fournie</span>
          <span>Aperçu</span>
        </div>
        {item.displayStatus === "LOCKED" ? (
          <>
            <Redacted rows={5} />
            {item.lockedByTitle !== null && (
              <p className="dfx-locked-note">
                La machine s&apos;ouvre une fois « {item.lockedByTitle} » résolu.
              </p>
            )}
          </>
        ) : hasListing(item) ? (
          <Listing item={item} />
        ) : (
          <p className="dfx-locked-note">{item.supplied}</p>
        )}
        <dl className="dfx-facts">
          <div>
            <dt>Fourni</dt>
            <dd>{item.supplied}</dd>
          </div>
          <div>
            <dt>À rendre</dt>
            <dd>{answerOf(item.type)}</dd>
          </div>
          <div>
            <dt>Temps</dt>
            <dd>{timeOf(item.timeLimitMin)}</dd>
          </div>
          <div>
            <dt>Récompense</dt>
            <dd>
              {solved ? (
                `${String(item.xpEarned ?? item.xpReward)} XP gagnés`
              ) : (
                <>
                  <s>{item.xpReward} XP</s>
                  {item.xpReward * weekly.multiplier} XP cette semaine
                </>
              )}
            </dd>
          </div>
          {!solved && (
            <div>
              <dt>Essais</dt>
              <dd>
                {left} sur {item.maxAttempts}
              </dd>
            </div>
          )}
          {item.hintCount > 0 && (
            <div>
              <dt>Indices</dt>
              <dd>{item.hintCount}, payés en XP</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

// ── A challenge's card ────────────────────────────────────────────────────────

function CardAction({ item }: { item: ChallengeItem }): React.JSX.Element {
  switch (item.displayStatus) {
    case "COMPLETED":
      return (
        <Link href={href(item.slug)} className="dfx-card__go">
          Voir le défi <span aria-hidden="true">→</span>
        </Link>
      );
    case "IN_PROGRESS": {
      const left = attemptsLeft(item);
      return (
        <Link href={href(item.slug)} className="dfx-card__go">
          Reprendre · {left} {plural(left, "essai")} {plural(left, "restant")}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      );
    }
    case "LOCKED":
      return item.prerequisiteSlug !== null && item.lockedByTitle !== null ? (
        <Link href={href(item.prerequisiteSlug)} className="dfx-card__go dfx-card__go--locked">
          <span>
            Termine d&apos;abord <b>{item.lockedByTitle}</b>
          </span>
        </Link>
      ) : (
        <p className="dfx-card__go dfx-card__go--locked">Verrouillé</p>
      );
    case "AVAILABLE":
      return (
        <Link href={href(item.slug)} className="dfx-card__go">
          Relever le défi <span aria-hidden="true">→</span>
        </Link>
      );
  }
}

function ChallengeCard({ item }: { item: ChallengeItem }): React.JSX.Element {
  const solved = item.displayStatus === "COMPLETED";
  return (
    <article className="dfx-card" data-status={item.displayStatus}>
      <div className="dfx-card__peek">
        <div className="dfx-card__peek-top">
          <span className="dfx-card__cat" data-cat={item.category}>
            {categoryMeta(item.category).short}
          </span>
          <StatusBadge status={item.displayStatus} />
        </div>
        <Peek item={item} />
      </div>
      <div className="dfx-card__body">
        <p className="dfx-card__ref">
          {item.refCode} · {TYPE_LABEL[item.type]}
        </p>
        <h3 className="dfx-card__title">{item.title}</h3>
        <p className="dfx-card__desc">{item.description}</p>
        <div className="dfx-card__meta">
          <span className="dfx-card__xp">
            {solved
              ? `${String(item.xpEarned ?? item.xpReward)} XP gagnés`
              : `${String(item.xpReward)} XP`}
          </span>
          <span>{difficultyMeta(item.difficulty).label}</span>
        </div>
      </div>
      <CardAction item={item} />
    </article>
  );
}

/** The last tile: how the week's challenge turns, and which one comes next. */
function NextTile({ next }: { next: ChallengeItem | null }): React.JSX.Element {
  return (
    <aside className="dfx-card dfx-card--next">
      <p className="dfx-eyebrow">
        <b>Chaque lundi</b>
      </p>
      <h3>Un nouveau défi de la semaine</h3>
      <p>
        Chaque défi du catalogue passe à son tour en défi de la semaine, du lundi au dimanche, et
        vaut alors le double de son XP.
      </p>
      {next !== null && (
        <p>
          La semaine prochaine : <Link href={href(next.slug)}>{next.title}</Link>.
        </p>
      )}
    </aside>
  );
}

// ── The page ──────────────────────────────────────────────────────────────────

/** The header's tally, one word a state; "en cours" does not take an s. */
const TALLY_WORD: Record<DisplayStatus, string> = {
  COMPLETED: "résolu",
  IN_PROGRESS: "en cours",
  AVAILABLE: "disponible",
  LOCKED: "verrouillé",
};

type Filter = "all" | "todo" | "done";

function matches(item: ChallengeItem, filter: Filter): boolean {
  if (filter === "todo") {
    return item.displayStatus === "AVAILABLE" || item.displayStatus === "IN_PROGRESS";
  }
  if (filter === "done") return item.displayStatus === "COMPLETED";
  return true;
}

const EMPTY: Record<Exclude<Filter, "all">, { title: string; message: string }> = {
  todo: {
    title: "Rien à faire pour l'instant",
    message:
      "Tout ce qui est ouvert est résolu. Un défi verrouillé s'ouvre quand celui qui le précède est fait.",
  },
  done: {
    title: "Aucun défi résolu",
    message: "Le défi de la semaine vaut le double d'XP : c'est un bon premier.",
  },
};

export function ChallengesClient({ items, weekly, nowMs }: Props): React.ReactElement {
  const [filter, setFilter] = useState<Filter>("all");

  const featured = weekly === null ? null : (items.find((item) => item.id === weekly.id) ?? null);
  const nextId = weekly?.nextId ?? null;
  const next =
    nextId !== null && nextId !== weekly?.id
      ? (items.find((item) => item.id === nextId) ?? null)
      : null;
  // Under "Tous", the week's challenge has its panel above; a filter asked for
  // by name shows it in the list too, where it belongs.
  const shown = items.filter(
    (item) => matches(item, filter) && (filter !== "all" || item.id !== featured?.id),
  );

  const count = (status: DisplayStatus): number =>
    items.filter((item) => item.displayStatus === status).length;
  const tally = (["COMPLETED", "IN_PROGRESS", "AVAILABLE", "LOCKED"] as const)
    .map((status) => ({ status, n: count(status) }))
    .filter(({ status, n }) => n > 0 || status !== "IN_PROGRESS");

  const tabs: TabItem<Filter>[] = [
    { key: "all", label: "Tous", count: items.length },
    { key: "todo", label: "À faire", count: items.filter((i) => matches(i, "todo")).length },
    { key: "done", label: "Résolus", count: items.filter((i) => matches(i, "done")).length },
  ];

  return (
    <div className="chx dfx">
      <header className="dfx-head">
        <div>
          <Crumb segments={["défis"]} />
          <h1 className="pg-title">Défis</h1>
          <p className="pg-lede">
            Des enquêtes sur pièces. Chaque défi te confie une machine Linux, dans ton navigateur :
            tu fouilles ses fichiers, tu trouves le flag, tu le soumets. Rien à installer.
          </p>
        </div>
        <ul className="dfx-tally" aria-label="Où tu en es">
          {tally.map(({ status, n }) => (
            <li key={status} data-tally={status}>
              <b>{n}</b>
              {status === "IN_PROGRESS" ? TALLY_WORD[status] : plural(n, TALLY_WORD[status])}
            </li>
          ))}
        </ul>
      </header>

      <ol className="dfx-steps">
        <li>
          <span className="dfx-steps__n">01</span>
          <div>
            <h2>Ouvre la machine</h2>
            <p>Chaque défi a la sienne, avec ses pièces : journaux, configurations, archives.</p>
          </div>
        </li>
        <li>
          <span className="dfx-steps__n">02</span>
          <div>
            <h2>Enquête à ta façon</h2>
            <p>ls, grep, find : tes commandes, ton rythme. Un indice se paie en XP.</p>
          </div>
        </li>
        <li>
          <span className="dfx-steps__n">03</span>
          <div>
            <h2>Soumets le flag</h2>
            <p>
              Il est à toi seul. Le bon te rapporte l&apos;XP du défi, le double pour le défi de la
              semaine.
            </p>
          </div>
        </li>
      </ol>

      {featured !== null && weekly !== null && (
        <WeekPanel item={featured} weekly={weekly} nowMs={nowMs} />
      )}

      <section aria-labelledby="dfx-list-title">
        <div className="dfx-list-head">
          <h2 id="dfx-list-title">Tous les défis</h2>
          <Tabs label="Filtrer les défis" items={tabs} value={filter} onChange={setFilter} />
        </div>

        {shown.length === 0 && filter !== "all" ? (
          <EmptyState title={EMPTY[filter].title} message={EMPTY[filter].message}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setFilter("all");
              }}
            >
              Voir tous les défis
            </button>
          </EmptyState>
        ) : (
          <div className="dfx-grid">
            {shown.map((item) => (
              <ChallengeCard key={item.id} item={item} />
            ))}
            {filter === "all" && <NextTile next={next} />}
          </div>
        )}
      </section>
    </div>
  );
}
