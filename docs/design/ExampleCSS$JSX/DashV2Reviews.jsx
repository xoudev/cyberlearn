// DashV2Reviews.jsx — Alert-style compact rows
function V2Reviews() {
  const items = [
    { n: '01', cat: 'cybersec', catLabel: 'Cybersec', title: 'XSS stockée vs réfléchie', due: 'Dû aujourd\'hui', time: '2 min' },
    { n: '02', cat: 'network', catLabel: 'Réseaux', title: 'Bases du handshake TLS 1.3', due: 'Dû aujourd\'hui', time: '3 min' },
    { n: '03', cat: 'dev', catLabel: 'Développement', title: 'Promesses et async/await', due: 'Dû demain', time: '2 min' },
  ];

  return (
    <section className="reviews-section">
      <div className="section-label">
        <div>
          <div className="section-label__eyebrow">02 · à réviser</div>
          <h2 className="section-label__title">3 leçons demandent ton attention.</h2>
        </div>
        <a href="#" className="section-label__cta">Tout réviser →</a>
      </div>

      <div className="reviews-block">
        {items.map((it) => (
          <div className="review-row" key={it.n}>
            <div className="review-row__index">{it.n}</div>
            <div className="review-row__body">
              <div className="review-row__meta">
                <span className={`review-row__meta-cat review-row__meta-cat--${it.cat}`}>{it.catLabel}</span>
                <span>·</span>
                <span>micro-quiz</span>
              </div>
              <h3 className="review-row__title">{it.title}</h3>
            </div>
            <div className="review-row__due">{it.due}</div>
            <div className="review-row__time">{it.time}</div>
            <div className="review-row__go">
              Réviser
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        ))}
        <div className="reviews-block__foot">
          <span>Révisions basées sur ta courbe d'oubli · algorithme SM-2</span>
          <span>Total · <b>~7 minutes</b></span>
        </div>
      </div>
    </section>
  );
}

window.V2Reviews = V2Reviews;
