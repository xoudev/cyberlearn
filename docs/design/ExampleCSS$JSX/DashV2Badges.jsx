// DashV2Badges.jsx — Trophy shelf
function Trophy({ rarity, rarityLabel, name, date, glyph }) {
  const Glyph = () => {
    const s = { width: 40, height: 40, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (glyph === 'drop') return (<svg {...s} viewBox="0 0 40 40"><path d="M20 4 C20 13 28 16 28 24 C28 28 24.5 32 20 32 C15.5 32 12 28 12 24 C12 16 20 13 20 4 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    if (glyph === 'flame') return (<svg {...s} viewBox="0 0 40 40"><path d="M20 4 C20 11 15 13 15 20 C15 22 16 23 17.5 23 C16 25 15 27 15 29 C15 33 18 36 21 36 C25 36 28 33 28 28 C28 22 22 20 22 14 C22 11 21 7 20 4 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    return (<svg {...s} viewBox="0 0 40 40"><ellipse cx="20" cy="10" rx="12" ry="4"/><path d="M8 10 V22 C8 25 13 27 20 27 C27 27 32 25 32 22 V10"/><path d="M8 22 V34 C8 37 13 39 20 39 C27 39 32 37 32 34 V22"/></svg>);
  };
  return (
    <article className={`trophy trophy--${rarity}`}>
      <span className="trophy__rarity-strip" />
      <div className="trophy__medallion">
        <div className="trophy__glyph"><Glyph /></div>
      </div>
      <div className="trophy__rarity">· {rarityLabel} ·</div>
      <h3 className="trophy__name">{name}</h3>
      <div className="trophy__date">Obtenu · {date}</div>
    </article>
  );
}

function V2Badges() {
  return (
    <section className="badges-section">
      <div className="section-label">
        <div>
          <div className="section-label__eyebrow">03 · trophées</div>
          <h2 className="section-label__title">Ton butin récent.</h2>
        </div>
        <a href="#" className="section-label__cta">Collection · 27 →</a>
      </div>

      <div className="badges-shelf">
        <Trophy rarity="legendary" rarityLabel="Légendaire" name="First Blood" date="il y a 2 j" glyph="drop" />
        <Trophy rarity="epic"       rarityLabel="Épique"     name="Streak 7 jours" date="aujourd'hui" glyph="flame" />
        <Trophy rarity="rare"       rarityLabel="Rare"       name="SQL Survivor" date="il y a 5 j" glyph="db" />
      </div>
    </section>
  );
}

window.V2Badges = V2Badges;
