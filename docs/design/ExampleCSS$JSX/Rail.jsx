// Rail.jsx — Right sidebar: TOC, First Blood, Rating
function Rail() {
  return (
    <aside className="rail">
      <section>
        <h4 className="rail__title">Dans cette leçon</h4>
        <nav className="toc">
          <a href="#" className="is-done">Pourquoi SQLi reste #1</a>
          <a href="#" className="is-done">Qu'est-ce qu'une injection SQL ?</a>
          <a href="#" className="is-active">Un exemple concret</a>
          <a href="#">Comment s'en défendre</a>
          <a href="#">Quiz de validation</a>
        </nav>
      </section>

      <FirstBlood />
      <Rating />
    </aside>
  );
}

function FirstBlood() {
  return (
    <section className="first-blood">
      <div className="first-blood__header">
        <svg className="first-blood__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5 C8 4 10 5 10 7.5 C10 9 9 10 8 10 C7 10 6 9 6 7.5 C6 5 8 4 8 1.5 Z" fill="currentColor" opacity="0.9"/>
          <path d="M4 9 C4 12 6 14 8 14 C10 14 12 12 12 9" stroke="currentColor" strokeWidth="1.3" fill="none"/>
        </svg>
        <span className="first-blood__heading">First Blood</span>
      </div>
      <p className="first-blood__sub">Les 3 premiers à avoir complété cette leçon.</p>
      <div className="winners">
        <div className="winner">
          <span className="winner__rank winner__rank--1">#1</span>
          <div className="winner__avatar winner__avatar--b">SL</div>
          <div className="winner__info">
            <span className="winner__name">sofia.lefranc</span>
            <span className="winner__time">3 min 42 s</span>
          </div>
        </div>
        <div className="winner">
          <span className="winner__rank winner__rank--2">#2</span>
          <div className="winner__avatar winner__avatar--a">TK</div>
          <div className="winner__info">
            <span className="winner__name">tkambou.dev</span>
            <span className="winner__time">5 min 18 s</span>
          </div>
        </div>
        <div className="winner">
          <span className="winner__rank winner__rank--3">#3</span>
          <div className="winner__avatar winner__avatar--c">AM</div>
          <div className="winner__info">
            <span className="winner__name">a.moreau</span>
            <span className="winner__time">6 min 05 s</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Rating() {
  return (
    <section className="rating">
      <div className="rating__lock">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="2" y="5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M3.5 5 V3.5 C3.5 2.4 4.4 1.5 5.5 1.5 C6.6 1.5 7.5 2.4 7.5 3.5 V5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        Évaluer — verrouillé
      </div>
      <div className="rating__stars">
        {[1,2,3,4,5].map(i => (
          <svg key={i} width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2 L11.2 6.5 L16 7.3 L12.5 10.8 L13.4 15.5 L9 13.3 L4.6 15.5 L5.5 10.8 L2 7.3 L6.8 6.5 Z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          </svg>
        ))}
      </div>
      <p className="rating__hint">Termine la leçon pour laisser une note et un commentaire.</p>
    </section>
  );
}

window.Rail = Rail;
