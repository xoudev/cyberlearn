import type { ProgressStatus } from "@cyberlearn/db";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { CATEGORY_KIND, KindGlyph } from "@/app/_components/path-catalog-card";

interface Props {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  xpReward: number;
  refCode: string;
  coverSrc: string | null;
  status: ProgressStatus;
  quizScore: { correct: number; total: number } | null;
  lockedPath: string | null;
}

/** Server-rendered metadata; the page owns availability and the card's destination. */
export function CatalogueLessonCard({
  title,
  description,
  category,
  difficulty,
  durationMinutes,
  xpReward,
  refCode,
  coverSrc,
  status,
  quizScore,
  lockedPath,
}: Props): React.ReactElement {
  const completed = status === "COMPLETED";
  const inProgress = status === "IN_PROGRESS";
  const state = lockedPath
    ? "locked"
    : completed
      ? "completed"
      : inProgress
        ? "active"
        : "available";
  const stateLabel = lockedPath
    ? "À débloquer"
    : completed
      ? "Terminée"
      : inProgress
        ? "En cours"
        : "Disponible";
  const action = lockedPath
    ? "Voir le parcours"
    : completed
      ? "Revoir la leçon"
      : inProgress
        ? "Reprendre la leçon"
        : "Lire la leçon";

  return (
    <article className="catalogue-lesson" data-state={state}>
      <div className="catalogue-lesson__cover">
        {coverSrc ? (
          <span
            className="catalogue-lesson__image"
            style={{ backgroundImage: `url("${coverSrc}")` }}
            aria-hidden="true"
          />
        ) : (
          <KindGlyph kind={CATEGORY_KIND[category] ?? "cyber"} size={72} />
        )}
        <span className="catalogue-lesson__category">{categoryMeta(category).short}</span>
        <span className="catalogue-lesson__reference">{refCode}</span>
      </div>
      <div className="catalogue-lesson__body">
        <div className="catalogue-lesson__meta">
          <span>{difficultyMeta(difficulty).label}</span>
          <span>{durationMinutes} min</span>
        </div>
        <h3>{title}</h3>
        <p className="catalogue-lesson__description">{description}</p>
        <div className="catalogue-lesson__progress">
          <span className="catalogue-lesson__state">
            {lockedPath && (
              <svg width="11" height="13" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <rect x="1" y="6" width="10" height="7" stroke="currentColor" />
                <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" />
              </svg>
            )}
            {stateLabel}
          </span>
          <span className="catalogue-lesson__xp">+{xpReward} XP</span>
          {completed && quizScore && (
            <span
              className="catalogue-lesson__score"
              title={`Quiz : ${String(quizScore.correct)} sur ${String(quizScore.total)}`}
            >
              Quiz {quizScore.correct}/{quizScore.total}
            </span>
          )}
        </div>
        {lockedPath && <p className="catalogue-lesson__unlock">Dans le parcours {lockedPath}</p>}
        <div className="catalogue-lesson__action">
          <span>{action}</span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </article>
  );
}
