// LessonV2Hero.jsx — Hero + mission briefing + timeline
function LV2Crumb() {
  return (
    <div className="crumb-term">
      <a href="#" style={{color:'inherit',textDecoration:'none'}}>leçons</a>
      <span className="sep">/</span>
      <a href="#" style={{color:'inherit',textDecoration:'none'}}><b>cybersec</b></a>
      <span className="sep">/</span>
      <span className="cur">intro_sqli.lesson</span>
    </div>
  );
}

function LV2Hero() {
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
          Comprends comment un attaquant transforme une requête innocente en porte dérobée,
          et apprends les trois défenses qui tiennent vraiment — requêtes préparées,
          validation, et principe du moindre privilège.
        </p>
      </div>

      <div className="briefing">
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

function LV2Timeline() {
  const nodes = [
    { state: 'done', label: 'Pourquoi SQLi', sub: '✓ 2 min' },
    { state: 'done', label: "Qu'est-ce que c'est", sub: '✓ 3 min' },
    { state: 'done', label: 'Exemple concret', sub: '✓ 3 min' },
    { state: 'current', label: 'Les défenses', sub: '~ 3 min' },
    { state: '',        label: 'Quiz final',  sub: '2 min' },
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

window.LV2Crumb = LV2Crumb;
window.LV2Hero = LV2Hero;
window.LV2Timeline = LV2Timeline;
