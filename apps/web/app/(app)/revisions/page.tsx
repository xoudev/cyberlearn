import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { reviewRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import {
  REVIEW_SESSION_SIZE,
  reviewDueLabel,
  reviewMinutes,
  reviewXpFor,
  waitingText,
} from "@cyberlearn/lib";
import { RevisionsList, type ReviewRow } from "./_components/revisions-list";
import { categoryMeta } from "@cyberlearn/lib/content/vocabulary";
import { BastionLogo } from "@/components/bastion-logo";
import "./revisions.css";

export const metadata: Metadata = { title: "Révisions" };
export const dynamic = "force-dynamic";

function timeEst(difficulty: string): string {
  return `${String(reviewMinutes(difficulty))} min`;
}

export default async function RevisionsPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const now = new Date();
  if (!(await revisionsEnabled(authUser.id))) {
    return (
      <div className="page-container learning-catalogue learning-workspace revisions-workspace">
        <RevisionHeading />
        <section className="revision-rest">
          <div className="revision-rest__mark">
            <BastionLogo size={72} />
          </div>
          <div>
            <p className="workspace-kicker">À ton rythme</p>
            <h2>Les révisions sont coupées.</h2>
            <p>
              Tu as désactivé la répétition espacée. Tes révisions t’attendent si tu la réactives.
            </p>
            <Link href="/settings/preferences" className="btn">
              Rouvrir les préférences
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Keep the session cap and order supplied by the review service.
  const [session, upcomingSchedules] = await Promise.all([
    reviewRepository.findSession(authUser.id, now),
    reviewRepository.findUpcoming(authUser.id, now, 10),
  ]);
  const dueSchedules = session.rows;
  const waiting = waitingText(session.waiting);
  const totalMinutes = dueSchedules.reduce((sum, s) => sum + reviewMinutes(s.lesson.difficulty), 0);
  const rows: ReviewRow[] = dueSchedules.map((s) => {
    const due = reviewDueLabel(s.nextReviewAt, now);
    const cat = categoryMeta(s.lesson.category);
    return {
      scheduleId: s.id,
      title: s.lesson.title,
      slug: s.lesson.slug,
      catLabel: cat.short,
      catColor: cat.color,
      catBorder: `color-mix(in srgb, ${cat.color} 35%, transparent)`,
      dueText: due.text,
      dueToday: due.kind === "today",
      est: timeEst(s.lesson.difficulty),
      reviewXp: reviewXpFor(s.lesson.xpReward),
    };
  });

  return (
    <div className="page-container learning-catalogue learning-workspace revisions-workspace">
      <RevisionHeading />
      <div className="catalogue-ledger">
        <span>
          <b>{rows.length}</b> à revoir aujourd’hui
        </span>
        <span>
          <b>~{totalMinutes}</b> minutes
        </span>
        <span className="catalogue-ledger__total">
          {REVIEW_SESSION_SIZE} leçons par session au plus
        </span>
      </div>
      <div className="revision-layout">
        <div className="revision-session">
          <div className="workspace-section">
            <h2>Ta session du jour</h2>
            <span>Les plus anciennes d’abord</span>
          </div>
          <RevisionsList
            rows={rows}
            empty={
              <section className="revision-rest">
                <div className="revision-rest__mark">
                  <BastionLogo size={72} />
                </div>
                <div>
                  <p className="workspace-kicker">Rien à rattraper</p>
                  <h2>Tout est à jour.</h2>
                  <p>
                    Aucune révision à faire pour le moment. Tu peux avancer sur une leçon ou revenir
                    à ton tableau de bord.
                  </p>
                  <div className="workspace-actions">
                    <Link href="/lessons" className="btn">
                      Choisir une leçon <span aria-hidden="true">↗</span>
                    </Link>
                    <Link href="/dashboard" className="workspace-link">
                      Retour au tableau de bord
                    </Link>
                  </div>
                </div>
              </section>
            }
            footer={
              <div className="revision-session__footer">
                <span>Prends le temps de te rappeler avant de noter.</span>
                <span>~{totalMinutes} min</span>
              </div>
            }
          >
            {waiting !== null && <p className="revision-waiting">{waiting}</p>}
            <Link href="/dashboard" className="workspace-link revision-back">
              Retour au tableau de bord
            </Link>
          </RevisionsList>
        </div>
        <aside className="revision-method" aria-labelledby="revision-method-title">
          <p className="workspace-kicker">La mémoire se travaille</p>
          <h2 id="revision-method-title">
            Un rappel.
            <br />
            Puis ça reste.
          </h2>
          <p>Essaie de retrouver les idées de la leçon, puis évalue ce que tu as retenu.</p>
          <dl>
            <div>
              <dt>Oublié</dt>
              <dd>On la revoit plus tôt.</dd>
            </div>
            <div>
              <dt>Difficile</dt>
              <dd>Encore un peu de pratique.</dd>
            </div>
            <div>
              <dt>Facile</dt>
              <dd>Le prochain rappel s’éloigne.</dd>
            </div>
          </dl>
          <p className="revision-method__note">
            Répétition espacée · SM-2
            <br />
            Une leçon suffisamment retenue sort du cycle.
          </p>
        </aside>
      </div>
      {upcomingSchedules.length > 0 && <UpcomingSection schedules={upcomingSchedules} now={now} />}
    </div>
  );
}

function RevisionHeading(): React.ReactElement {
  return (
    <header className="catalogue-masthead">
      <div className="catalogue-masthead__title">
        <p className="catalogue-masthead__eyebrow">Consolider / Garder les bons réflexes</p>
        <h1>
          Révisions<span>.</span>
        </h1>
        <p>Ce que tu apprends mérite de rester.</p>
      </div>
    </header>
  );
}

interface Schedule {
  id: string;
  nextReviewAt: Date;
  lesson: { title: string; difficulty: string };
}

function UpcomingSection({
  schedules,
  now,
}: {
  schedules: Schedule[];
  now: Date;
}): React.ReactElement {
  return (
    <section className="revision-upcoming" aria-labelledby="revision-upcoming-title">
      <div className="workspace-section">
        <h2 id="revision-upcoming-title">Les prochains rappels</h2>
        <span>À venir</span>
      </div>
      <div className="revision-upcoming__list">
        {schedules.map((s) => {
          const daysUntil = Math.ceil((s.nextReviewAt.getTime() - now.getTime()) / 86_400_000);
          return (
            <div key={s.id}>
              <h3>{s.lesson.title}</h3>
              <span>
                Dans {daysUntil} jour{daysUntil > 1 ? "s" : ""} · {timeEst(s.lesson.difficulty)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
