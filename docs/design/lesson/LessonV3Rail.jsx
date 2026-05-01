// LessonV3Rail.jsx — TOC, First Blood, Rating + Next-up bar + App
function LV3Rail() {
  const toc = [
    { n: '01', label: 'Pourquoi SQLi', meta: '✓', state: 'is-done' },
    { n: '02', label: 'Le code vulnérable', meta: '✓', state: 'is-done' },
    { n: '03', label: 'Corrige le bug', meta: '✓', state: 'is-done' },
    { n: '04', label: 'Reconnais ta cible', meta: '~', state: 'is-active' },
    { n: '05', label: 'Vérification', meta: '2m', state: '' },
  ];
  return (
    <aside className="rail-v2">
      <section>
        <div className="rail-v2__head">Dans cette leçon · <b>3/5</b></div>
        <nav className="toc-v2">
          {toc.map((t) => (
            <a key={t.n} href="#" className={`toc-v2__item ${t.state}`}>
              <span className="toc-v2__num">{t.n}</span>
              <span>{t.label}</span>
              <span className="toc-v2__meta">{t.meta}</span>
            </a>
          ))}
        </nav>
      </section>

      <section>
        <div className="rail-v2__head">03 · Premiers arrivés</div>
        <div className="first-v2__list">
          <div className="first-v2__row first-v2__row--1">
            <span className="first-v2__rank">#01</span>
            <div className="first-v2__avatar first-v2__avatar--b">SL</div>
            <span className="first-v2__name">sofia.lefranc</span>
            <span className="first-v2__time">3m 42s</span>
          </div>
          <div className="first-v2__row first-v2__row--2">
            <span className="first-v2__rank">#02</span>
            <div className="first-v2__avatar first-v2__avatar--a">TK</div>
            <span className="first-v2__name">tkambou.dev</span>
            <span className="first-v2__time">5m 18s</span>
          </div>
          <div className="first-v2__row first-v2__row--3">
            <span className="first-v2__rank">#03</span>
            <div className="first-v2__avatar first-v2__avatar--c">AM</div>
            <span className="first-v2__name">a.moreau</span>
            <span className="first-v2__time">6m 05s</span>
          </div>
        </div>
      </section>

      <section>
        <div className="rail-v2__head">Évaluer · verrouillé</div>
        <div className="rating-v2">
          <div className="rating-v2__lock">
            <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
              <rect x="2" y="5" width="7" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3.5 5 V3.5 C3.5 2.4 4.4 1.5 5.5 1.5 C6.6 1.5 7.5 2.4 7.5 3.5 V5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            locked
          </div>
          <div className="rating-v2__stars">
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2 L11.2 6.5 L16 7.3 L12.5 10.8 L13.4 15.5 L9 13.3 L4.6 15.5 L5.5 10.8 L2 7.3 L6.8 6.5 Z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              </svg>
            ))}
          </div>
          <p className="rating-v2__hint">Termine la leçon pour noter et commenter.</p>
        </div>
      </section>
    </aside>
  );
}

function LV3NextBar() {
  return (
    <div className="next-bar">
      <div className="next-bar__preview">
        <span className="next-bar__label">Prochaine leçon</span>
        <h3 className="next-bar__title">XSS stockée vs réfléchie</h3>
        <div className="next-bar__meta">
          <span>Cybersec</span><span className="sep">·</span>
          <span>Intermédiaire</span><span className="sep">·</span>
          <span>9 min</span><span className="sep">·</span>
          <span className="xp">+80 XP</span>
        </div>
      </div>
      <div className="next-bar__actions">
        <button className="next-bar__btn" type="button">Marquer terminé</button>
        <a href="#" className="next-bar__btn next-bar__btn--primary">
          Leçon suivante
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  );
}

function LessonV3App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <main className="main">
        <div className="lesson">
          <LV3Crumb />
          <LV3Hero />
          <LV3Timeline />
          <div className="content-grid">
            <div className="content-main">
              <LV3Body />
            </div>
            <LV3Rail />
          </div>
          <LV3NextBar />
        </div>
      </main>
    </div>
  );
}

const lv3Root = ReactDOM.createRoot(document.getElementById('root'));
lv3Root.render(<LessonV3App />);
