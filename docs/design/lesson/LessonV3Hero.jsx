// LessonV3Hero.jsx — Hero + mission briefing + timeline (refined for v3)
function LV3Crumb() {
  return (
    <div className="crumb-v3">
      <span className="crumb-v3__seg">~</span>
      <span className="crumb-v3__sep">/</span>
      <span className="crumb-v3__seg">cyberlearn</span>
      <span className="crumb-v3__sep">/</span>
      <span className="crumb-v3__seg">cybersec</span>
      <span className="crumb-v3__sep">/</span>
      <span className="crumb-v3__cur">intro_sqli.lesson</span>
    </div>
  );
}

function LV3Hero() {
  return (
    <section className="lesson-hero">
      <div>
        <div className="lesson-hero__tags">
          <span className="angular-tag angular-tag--cybersec">Cybersec</span>
          <span className="angular-tag angular-tag--intermediate">Intermédiaire</span>
          <span className="angular-tag angular-tag--new">Core · Module 02</span>
        </div>
        <h1 className="lesson-hero__title">Introduction aux <em>injections&nbsp;SQL</em>.</h1>
        <p className="lesson-hero__lede">
          Comprends comment un attaquant transforme une requête innocente en porte
          dérobée, puis pratique en live — sandbox Python, terminal Linux,
          et quiz de validation. Tu repars avec les trois défenses qui tiennent vraiment.
        </p>
      </div>

      <div className="briefing">
        <span className="briefing__corner briefing__corner--tl" />
        <span className="briefing__corner briefing__corner--tr" />
        <span className="briefing__corner briefing__corner--bl" />
        <span className="briefing__corner briefing__corner--br" />
        <div className="briefing__head">
          <span className="briefing__head-dot">mission briefing</span>
          <span>id · 0x4A·SQLi</span>
        </div>
        <div className="briefing__body">
          <div className="briefing__row">
            <span className="briefing__label">Durée</span>
            <span className="briefing__value briefing__value--time">12:00</span>
          </div>
          <div className="briefing__row">
            <span className="briefing__label">Récompense</span>
            <span className="briefing__value briefing__value--xp">+100 XP</span>
          </div>
          <div className="briefing__row">
            <span className="briefing__label">Difficulté</span>
            <span className="briefing__value">Intermédiaire</span>
          </div>
          <div className="briefing__row">
            <span className="briefing__label">Statut</span>
            <span className="briefing__value briefing__value--status">En cours</span>
          </div>
          <div className="briefing__row briefing__row--full">
            <span className="briefing__label">Progression · 3/5 sections</span>
            <div className="briefing__bar"><div className="briefing__bar-fill" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LV3Timeline() {
  const nodes = [
    { state: 'done', label: 'Pourquoi SQLi', sub: '✓ 2 min' },
    { state: 'done', label: "Qu'est-ce que c'est", sub: '✓ 3 min' },
    { state: 'done', label: 'Exemple concret', sub: '✓ 3 min' },
    { state: 'current', label: 'Pratique live', sub: '~ 4 min' },
    { state: '',        label: 'Quiz final',   sub: '2 min' },
  ];
  return (
    <div className="timeline">
      <div className="timeline__line" />
      <div className="timeline__line-fill" />
      <div className="timeline__nodes">
        {nodes.map((n, i) => (
          <div key={i} className={`timeline__node ${n.state ? 'timeline__node--'+n.state : ''}`}>
            <div className="timeline__label"><b>{String(i+1).padStart(2,'0')} · {n.label}</b></div>
            <span className="timeline__dot" />
            <div className="timeline__sub">{n.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.LV3Crumb = LV3Crumb;
window.LV3Hero = LV3Hero;
window.LV3Timeline = LV3Timeline;
