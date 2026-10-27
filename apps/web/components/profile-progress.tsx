export function ProfileProgress({
  current,
  needed,
  level,
  total,
}: {
  current: number;
  needed: number;
  level: number;
  total: number;
}): React.ReactElement {
  const percent = needed > 0 ? Math.min(100, Math.max(0, (current / needed) * 100)) : 100;
  return (
    <section className="profile-progress" aria-label="Progression de niveau">
      <div className="profile-progress__level">
        <span>Niveau</span>
        <strong>{level}</strong>
      </div>
      <div className="profile-progress__body">
        <div className="profile-progress__headline">
          <h2>
            {Math.max(0, needed - current).toLocaleString("fr-FR")} XP avant le niveau {level + 1}
          </h2>
          <span>{total.toLocaleString("fr-FR")} XP au total</span>
        </div>
        <div
          className="profile-progress__track"
          role="progressbar"
          aria-label={`Progression vers le niveau ${String(level + 1)}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-valuetext={`${String(current)} sur ${String(needed)} XP`}
        >
          <span style={{ width: `${String(percent)}%` }} />
        </div>
        <p>
          {current.toLocaleString("fr-FR")} / {needed.toLocaleString("fr-FR")} XP{" "}
          <span>{Math.round(percent)} %</span>
        </p>
      </div>
    </section>
  );
}
