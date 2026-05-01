// DashV2Stats.jsx — Oversized numbers, minimal labels
function V2Stats() {
  return (
    <section className="stats-section">
      <div className="section-label">
        <div>
          <div className="section-label__eyebrow">04 · chiffres bruts</div>
          <h2 className="section-label__title">Ce mois-ci.</h2>
        </div>
      </div>
      <div className="stats-big">
        <div className="stat-big stat-big--highlight">
          <span className="stat-big__label">LEÇONS COMPLÉTÉES</span>
          <div className="stat-big__n">12</div>
          <div className="stat-big__delta"><span className="stat-big__arrow">↗</span> +3 cette semaine</div>
        </div>
        <div className="stat-big">
          <span className="stat-big__label">STREAK ACTUEL</span>
          <div className="stat-big__n">7<span className="stat-big__unit">j</span></div>
          <div className="stat-big__delta stat-big__delta--flat">Record perso · 12 j</div>
        </div>
        <div className="stat-big">
          <span className="stat-big__label">BADGES OBTENUS</span>
          <div className="stat-big__n">8</div>
          <div className="stat-big__delta"><span className="stat-big__arrow">↗</span> +2 ce mois</div>
        </div>
        <div className="stat-big">
          <span className="stat-big__label">CERTIFICATS</span>
          <div className="stat-big__n">1</div>
          <div className="stat-big__delta stat-big__delta--flat">sur 4 disponibles</div>
        </div>
      </div>
    </section>
  );
}

function DashV2App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <main className="main">
        <div className="dash">
          <V2StatusStrip />
          <V2Hero />
          <V2Terminal />
          <V2Reviews />
          <V2Paths />
          <V2Badges />
          <V2Stats />
        </div>
      </main>
    </div>
  );
}

const v2Root = ReactDOM.createRoot(document.getElementById('root'));
v2Root.render(<DashV2App />);
