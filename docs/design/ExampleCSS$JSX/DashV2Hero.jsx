// DashV2Hero.jsx — Hero: massive type + XP hero moment
function V2StatusStrip() {
  const now = new Date();
  const d = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="status-strip">
      <span>SESSION · <b>#4812</b></span>
      <span className="status-strip__sep">/</span>
      <span>{d.toUpperCase()}</span>
      <span className="status-strip__sep">/</span>
      <span className="status-strip__live">SYNC EN DIRECT</span>
      <span className="status-strip__sep">/</span>
      <span>3 leçons dues · 2 défis actifs</span>
    </div>
  );
}

function V2Hero() {
  return (
    <section className="hero">
      <div className="hero__left">
        <div className="hero__eyebrow">Bon retour · 14 h 02</div>
        <h1 className="hero__greeting">
          Bonjour,<br />
          <em>Jordan.</em>
        </h1>
        <p className="hero__sub">
          Tu reprends là où tu t'es arrêté.
          <span className="streak-chip">
            <span className="streak-chip__flame">🔥</span>
            <span className="streak-chip__num">7</span>
            <span className="streak-chip__label">jours</span>
          </span>
        </p>
      </div>

      <div className="xp-hero">
        <div className="xp-hero__corners"><span/><span/><span/><span/></div>

        <div className="xp-hero__head">
          <div>
            <div className="xp-hero__label">PROGRESSION</div>
            <div className="xp-hero__title">Apprenti confirmé</div>
          </div>
          <div className="xp-hero__rank">
            Rang <b>#342</b><br/>
            Top 4% FR
          </div>
        </div>

        <div className="xp-hero__body">
          <div className="xp-hero__level-num">14</div>
          <div className="xp-hero__level-meta">
            <span>NIVEAU ACTUEL</span>
            <span>→ Expert (LVL 15)</span>
          </div>
        </div>

        <div className="xp-hero__bar-wrap">
          <div className="xp-hero__bar-head">
            <span><b>2 840</b> XP</span>
            <span>3 500 XP</span>
          </div>
          <div className="xp-hero__bar">
            <div className="xp-hero__bar-fill" style={{ width: '81%' }} />
          </div>
          <div className="xp-hero__bar-foot">
            <span>81% · palier presque atteint</span>
            <span><b>+660 XP</b></span>
          </div>
        </div>
      </div>
    </section>
  );
}

window.V2StatusStrip = V2StatusStrip;
window.V2Hero = V2Hero;
