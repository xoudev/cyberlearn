import React from "react";
import { bestScore, domainVerdict, lastDomainScores, verdictTone } from "@cyberlearn/lib/exam/mock";
import type { MockOverview } from "@/lib/exam/mock-exam";
import { plural } from "./mock-exam-bits";

// Pinned to the site's zone, so the server and the browser print the same day.
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * A path's mock exam before an attempt, framed like the final exam's intro:
 * what the exam is, then on chalk its three figures, the rules a practice run
 * actually has and an attempt still running; beside it, the modules it covers (with the
 * last score of each, once there is one) and the attempts already handed in.
 *
 * Drawn in the window the path's page opens (?mock=1,
 * paths/[slug]/_components/mock-exam-dialog.tsx), whose header carries the
 * path's name and whose actions start the exam: the exam itself runs on its
 * own page (mock-exam-flow.tsx).
 */
export function MockExamIntro({ overview }: { overview: MockOverview }): React.ReactElement {
  const { history } = overview;
  const lastByDomain = lastDomainScores(history);
  const best = bestScore(history);
  const moduleCount = overview.domains.length;

  return (
    <div className="mkx-intro">
      <div className="mkx-intro__main">
        <p className="pg-lede">
          {String(overview.questionCount)} questions tirées des quiz du parcours, trois par module,
          en {String(overview.timeLimitMinutes)} minutes. Comme à une certification, le score se lit
          par module : chaque module dit ce qui est acquis et ce qui reste à revoir.
        </p>

        <div className="mkx-departure">
          <ul className="mkx-stats" aria-label="L'examen en chiffres">
            <li className="mkx-stat">
              <span className="mkx-stat__lbl">Questions</span>
              <span className="mkx-stat__val">{overview.questionCount}</span>
            </li>
            <li className="mkx-stat">
              <span className="mkx-stat__lbl">Chrono</span>
              <span className="mkx-stat__val">
                {overview.timeLimitMinutes}
                <small> min</small>
              </span>
            </li>
            <li className="mkx-stat">
              <span className="mkx-stat__lbl">{plural(moduleCount, "Module")}</span>
              <span className="mkx-stat__val">{moduleCount}</span>
            </li>
          </ul>

          <ul className="mkx-rules">
            <li>
              <span className="mkx-rules__k">Chrono</span>
              <span>
                Il part dès que tu commences et ne s&apos;arrête plus. À 00:00, ta copie est rendue
                telle quelle.
              </span>
            </li>
            <li>
              <span className="mkx-rules__k">Verdict</span>
              <span>
                Chaque module reçoit le sien : acquis, à consolider ou à revoir, avec la correction
                de chaque question.
              </span>
            </li>
            <li>
              <span className="mkx-rules__k">Sans enjeu</span>
              <span>
                C&apos;est un entraînement : ni certificat, ni XP, autant de fois que tu veux.
              </span>
            </li>
          </ul>

          {overview.ready && overview.running !== null ? (
            <p className="mkx-live">
              <span className="mkx-live__dot" aria-hidden="true" />
              Un examen blanc est en cours : le chrono tourne toujours. Tes réponses d&apos;avant
              sont gardées sur cet appareil, tu les retrouves en reprenant.
            </p>
          ) : null}
          {overview.ready ? null : (
            <p className="mkx-note">
              Ce parcours n&apos;a pas encore assez de questions pour un examen blanc.
            </p>
          )}
        </div>
      </div>

      <div className="mkx-intro__side">
        <div>
          <div className="mkx-head">
            <h2>Les modules couverts</h2>
            <span className="mkx-head__meta">
              {moduleCount} {plural(moduleCount, "module")}
            </span>
          </div>
          {moduleCount > 0 ? (
            <ul className="mkx-mods" aria-label="Les modules couverts">
              {overview.domains.map((domain) => {
                const last = lastByDomain.get(domain.domain);
                return (
                  <li key={domain.domain}>
                    <span className="mkx-mods__name">{domain.domain}</span>
                    <span className="mkx-mods__n">
                      {String(domain.drawn)} question{domain.drawn > 1 ? "s" : ""}
                    </span>
                    {last !== undefined ? (
                      <span className="mkx-mods__last" data-tone={verdictTone(last.percent)}>
                        Dernier examen : {last.correct} / {last.total} ·{" "}
                        {domainVerdict(last.percent)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mkx-empty">Aucun module de ce parcours n&apos;a encore de quiz.</p>
          )}
        </div>

        <section aria-labelledby="mkx-hist-title">
          <div className="mkx-head">
            <h2 id="mkx-hist-title">Tes examens blancs</h2>
            {best !== null ? (
              <span className="mkx-head__meta">
                {history.length} derniers · meilleur {best} %
              </span>
            ) : null}
          </div>
          {history.length > 0 ? (
            <ol className="mkx-hist">
              {history.map((attempt) => (
                <li key={attempt.submittedAt} data-tone={verdictTone(attempt.score)}>
                  <span className="mkx-hist__date">
                    {dayFormat.format(new Date(attempt.submittedAt))}
                  </span>
                  <span className="mkx-meter" aria-hidden="true">
                    <i style={{ width: `${String(attempt.score)}%` }} />
                  </span>
                  <span className="mkx-hist__score">
                    {attempt.score} %
                    {attempt.late ? <span className="mkx-hist__late">hors délai</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mkx-empty">
              Aucun examen blanc rendu sur ce parcours pour l&apos;instant : tes scores
              s&apos;afficheront ici.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
