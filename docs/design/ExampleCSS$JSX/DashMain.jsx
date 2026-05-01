// DashMain.jsx — Dashboard content sections
function Welcome() {
  return (
    <section className="welcome">
      <div className="welcome__greeting">
        <h1>Bon retour, Jordan <span className="wave">👋</span></h1>
        <p>
          Tu es en streak de
          <span className="streak">🔥 7 jours</span>
        </p>
      </div>
      <XPCard />
    </section>
  );
}

function XPCard() {
  return (
    <div className="xp-card">
      <div className="xp-card__head">
        <div className="xp-card__level-block">
          <div className="xp-card__level-ring">
            <div className="xp-card__level-inner">14</div>
          </div>
          <div>
            <span className="xp-card__eyebrow">Niveau actuel</span>
            <div className="xp-card__title">Apprenti confirmé</div>
          </div>
        </div>
        <div className="xp-card__value">
          <b>2 840</b>
          / 3 500 XP
        </div>
      </div>
      <div className="xp-card__bar">
        <div className="xp-card__bar-fill" style={{ width: '81%' }} />
      </div>
      <div className="xp-card__foot"><b>660 XP</b> avant le niveau 15</div>
    </div>
  );
}

function ContinueSection() {
  return (
    <section>
      <div className="section-head">
        <h2>Continuer</h2>
        <a href="#" className="section-head__link">Voir tout l'historique →</a>
      </div>
      <div className="continue">
        <div className="continue__thumb">
          <div className="continue__thumb-code">
            <span className="c"># exploit démo</span><br/>
            <span className="k">SELECT</span> * <span className="k">FROM</span> users<br/>
            <span className="k">WHERE</span> id=<span className="s">'1'</span> <span className="k">OR</span> <span className="s">'1'</span>=<span className="s">'1'</span>
          </div>
        </div>
        <div className="continue__body">
          <div className="continue__meta">
            <span className="tag tag--cybersec">Cybersec</span>
            <span className="tag tag--intermediate">Intermédiaire</span>
            <span className="tag tag--time">12 min</span>
          </div>
          <h3 className="continue__title">Introduction aux injections SQL</h3>
          <p className="continue__sub">
            Tu as terminé l'exemple concret. Prochaine section : les trois défenses qui fonctionnent vraiment.
          </p>
          <div className="continue__progress">
            <div className="continue__progress-bar"><div className="continue__progress-fill" /></div>
            <span className="continue__progress-label"><b>3 / 5</b> sections</span>
          </div>
        </div>
        <a href="Lesson Detail Page.html" className="btn btn--primary">
          Continuer
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </section>
  );
}

function Reviews() {
  const items = [
    { title: 'XSS stockée vs réfléchie', cat: 'cybersec', catLabel: 'Cybersec', time: '2 min' },
    { title: 'Bases du handshake TLS 1.3', cat: 'network', catLabel: 'Réseaux', time: '3 min' },
    { title: 'Promesses et async/await', cat: 'dev', catLabel: 'Dev', time: '2 min' },
  ];
  return (
    <section>
      <div className="section-head">
        <h2>Révisions du jour</h2>
        <a href="#" className="section-head__link">Tout réviser →</a>
      </div>
      <div className="reviews">
        {items.map((it) => (
          <div className="review" key={it.title}>
            <div className="review__head">
              <span className={`tag tag--${it.cat}`}>{it.catLabel}</span>
              <span className="tag tag--time">{it.time}</span>
            </div>
            <h3 className="review__title">{it.title}</h3>
            <div className="review__foot">
              <span className="continue__progress-label" style={{fontSize: 11}}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{verticalAlign: '-1px', marginRight: 4}}>
                  <path d="M2 6 C2 3.8 3.8 2 6 2 L9 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M7 0 L9 2 L7 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 5 C9 7.2 7.2 9 5 9 L2 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M4 11 L2 9 L4 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Micro-quiz
              </span>
              <button className="btn btn--ghost btn--sm" type="button">Réviser</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Paths() {
  const paths = [
    {
      title: 'Pentester Web — de zéro à CTF',
      sub: 'OWASP Top 10, Burp, réutilisation de session, escalade de privilèges.',
      cat: 'cybersec', catLabel: 'Cybersec',
      diff: 'intermediate', diffLabel: 'Intermédiaire',
      lessons: 24, hours: '~18 h',
      shape: 'shield',
    },
    {
      title: 'Fullstack JavaScript moderne',
      sub: 'Node, React, TypeScript, Postgres. Déploie une vraie app en 4 semaines.',
      cat: 'dev', catLabel: 'Développement',
      diff: 'beginner', diffLabel: 'Débutant',
      lessons: 32, hours: '~22 h',
      shape: 'code',
    },
  ];

  return (
    <section>
      <div className="section-head">
        <h2>Parcours recommandés</h2>
        <a href="#" className="section-head__link">Explorer tous les parcours →</a>
      </div>
      <div className="paths">
        {paths.map((p) => (
          <div className="path" key={p.title}>
            <svg className="path__icon" viewBox="0 0 140 140" fill="none" aria-hidden>
              {p.shape === 'shield' ? (
                <path d="M70 10 L120 30 V70 C120 95 100 120 70 130 C40 120 20 95 20 70 V30 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
              ) : (
                <>
                  <path d="M50 45 L20 70 L50 95" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                  <path d="M90 45 L120 70 L90 95" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                  <path d="M80 30 L60 110" stroke="currentColor" strokeWidth="2.5"/>
                </>
              )}
            </svg>
            <div className="path__meta">
              <span className={`tag tag--${p.cat}`}>{p.catLabel}</span>
              <span className={`tag tag--${p.diff}`}>{p.diffLabel}</span>
            </div>
            <h3 className="path__title">{p.title}</h3>
            <p className="path__sub">{p.sub}</p>
            <div className="path__stats">
              <span><b>{p.lessons}</b> leçons</span>
              <span>{p.hours}</span>
            </div>
            <div className="path__progress">
              <div className="path__progress-head">
                <span>Pas encore commencé</span>
                <span>0%</span>
              </div>
              <div className="path__progress-bar"><div className="path__progress-fill" style={{width: '0%'}} /></div>
            </div>
            <div className="path__foot">
              <button className="btn btn--primary btn--sm" type="button">Commencer</button>
              <button className="btn btn--ghost btn--sm" type="button">Aperçu</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Badges() {
  const badges = [
    { name: 'First Blood', rarity: 'legendary', rarityLabel: 'Légendaire', date: 'il y a 2 j', icon: 'drop' },
    { name: 'Streak 7 jours', rarity: 'epic', rarityLabel: 'Épique', date: 'aujourd\'hui', icon: 'flame' },
    { name: 'SQL Survivor', rarity: 'rare', rarityLabel: 'Rare', date: 'il y a 5 j', icon: 'db' },
  ];
  const Glyph = ({ name }) => {
    const s = { width: 26, height: 26, viewBox: '0 0 26 26', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (name === 'drop') return (<svg {...s}><path d="M13 3 C13 8 18 10 18 15 C18 18 15.5 21 13 21 C10.5 21 8 18 8 15 C8 10 13 8 13 3 Z" fill="currentColor" fillOpacity="0.2"/></svg>);
    if (name === 'flame') return (<svg {...s}><path d="M13 3 C13 7 10 8 10 12 C10 13.5 11 14 12 14 C11 15 10 16 10 18 C10 20.5 12 22 14 22 C16.5 22 18 20 18 17 C18 13 14 12 14 9 C14 7 13 5 13 3 Z" fill="currentColor" fillOpacity="0.2"/></svg>);
    return (<svg {...s}><ellipse cx="13" cy="6" rx="7" ry="2.5"/><path d="M6 6 V13 C6 14.5 9 16 13 16 C17 16 20 14.5 20 13 V6"/><path d="M6 13 V20 C6 21.5 9 23 13 23 C17 23 20 21.5 20 20 V13"/></svg>);
  };

  return (
    <section>
      <div className="section-head">
        <h2>Badges récents</h2>
        <a href="#" className="section-head__link">Voir les 27 badges →</a>
      </div>
      <div className="badges">
        {badges.map((b) => (
          <div className="badge-card" key={b.name}>
            <div className={`badge-icon badge-icon--${b.rarity}`}><Glyph name={b.icon} /></div>
            <div className="badge-info">
              <span className={`badge-info__rarity badge-info__rarity--${b.rarity}`}>{b.rarityLabel}</span>
              <span className="badge-info__name">{b.name}</span>
              <span className="badge-info__date">Obtenu {b.date}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { label: 'Leçons complétées', value: '12', delta: '+3 cette semaine', icon: 'check' },
    { label: 'Streak actuel', value: '7', unit: 'j', delta: 'record perso : 12 j', icon: 'flame', flat: true },
    { label: 'Badges obtenus', value: '8', delta: '+2 ce mois', icon: 'badge' },
    { label: 'Certificats', value: '1', delta: 'sur 4 disponibles', icon: 'cert', flat: true },
  ];
  const Icon = ({ name }) => {
    const s = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (name === 'check') return (<svg viewBox="0 0 16 16" {...s}><path d="M3 8.5 L6.5 12 L13 4"/></svg>);
    if (name === 'flame') return (<svg viewBox="0 0 16 16" {...s}><path d="M8 2 C8 4.5 6 5.5 6 8 C6 9 6.5 9.5 7 9.5 C6.5 10 6 11 6 12 C6 13.7 7 14.5 8.5 14.5 C10 14.5 11 13 11 11 C11 9 9 8 9 6 C9 4.5 8.5 3.3 8 2 Z"/></svg>);
    if (name === 'badge') return (<svg viewBox="0 0 16 16" {...s}><path d="M8 1.5 L10 3 L12.5 2.7 L13 5.2 L14.5 7 L13 8.8 L12.5 11.3 L10 11 L8 12.5 L6 11 L3.5 11.3 L3 8.8 L1.5 7 L3 5.2 L3.5 2.7 L6 3 Z"/><circle cx="8" cy="7" r="2"/></svg>);
    return (<svg viewBox="0 0 16 16" {...s}><rect x="2" y="3" width="12" height="8" rx="1"/><path d="M5 13.5 L6.5 11.5"/><path d="M11 13.5 L9.5 11.5"/><circle cx="8" cy="7" r="1.5"/></svg>);
  };
  return (
    <section>
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__icon"><Icon name={s.icon} /></div>
            <span className="stat__label">{s.label}</span>
            <div className="stat__value">
              {s.value}
              {s.unit && <span className="stat__value-unit">{s.unit}</span>}
            </div>
            <span className={`stat__delta ${s.flat ? 'stat__delta--flat' : ''}`}>{s.delta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashApp() {
  return (
    <div className="app">
      <DashNavbar />
      <DashSidebar />
      <main className="main">
        <div className="dash">
          <Welcome />
          <ContinueSection />
          <Reviews />
          <Paths />
          <Badges />
          <Stats />
        </div>
      </main>
    </div>
  );
}

const dashRoot = ReactDOM.createRoot(document.getElementById('root'));
dashRoot.render(<DashApp />);
