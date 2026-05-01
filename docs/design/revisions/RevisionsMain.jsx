// RevisionsMain.jsx — Cyber Learn daily revisions
const REVS = [
  { n: '01', cat: 'cybersec', catLabel: 'Cybersec',      title: 'XSS stockée vs réfléchie',   due: "Dû aujourd'hui", dueKind: 'today',    time: '2 min' },
  { n: '02', cat: 'network',  catLabel: 'Réseaux',       title: 'Bases du handshake TLS 1.3', due: "Dû aujourd'hui", dueKind: 'today',    time: '3 min' },
  { n: '03', cat: 'dev',      catLabel: 'Développement', title: 'Promesses et async/await',   due: 'Dû demain',      dueKind: 'tomorrow', time: '2 min' },
];

function Breadcrumb() {
  return (
    <div className="rv-breadcrumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span className="current">révisions</span>
      <span className="caret" />
    </div>
  );
}

function ReviewRow({ it }) {
  return (
    <div className="review-row">
      <div className="review-row__index">{it.n}</div>
      <div className="review-row__body">
        <div className="review-row__meta">
          <span className={`review-row__meta-cat review-row__meta-cat--${it.cat}`}>{it.catLabel}</span>
          <span>·</span>
          <span>micro-quiz</span>
        </div>
        <h3 className="review-row__title">{it.title}</h3>
      </div>
      <div className={`review-row__due ${it.dueKind === 'tomorrow' ? 'review-row__due--soon' : ''}`}>{it.due}</div>
      <div className="review-row__time">{it.time}</div>
      <div className="review-row__go">
        Réviser
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function Revisions() {
  return (
    <main className="main">
      <div className="rv-wrap">
        <Breadcrumb />

        <div className="rv-eyebrow">SESSION · <b>SM-2</b> · COURBE D'OUBLI</div>
        <h1 className="rv-title"><em>3 révisions</em> en attente.</h1>
        <p className="rv-sub">
          Tes prochaines micro-révisions, ordonnées par échéance. Chaque session
          consolide ce que tu as appris cette semaine.
        </p>

        <section className="reviews-section" style={{marginBottom: 0}}>
          <div className="reviews-block">
            {REVS.map(it => <ReviewRow key={it.n} it={it} />)}
            <div className="reviews-block__foot">
              <span>Révisions basées sur ta courbe d'oubli · algorithme SM-2</span>
              <span>Total · <b>~7 minutes</b></span>
            </div>
          </div>
        </section>

        <div className="rv-cta-row">
          <a href="#" className="rv-primary">
            Tout réviser <span className="arrow">→</span>
          </a>
          <a href="#" className="rv-secondary">← Retour au dashboard</a>
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <Revisions />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
