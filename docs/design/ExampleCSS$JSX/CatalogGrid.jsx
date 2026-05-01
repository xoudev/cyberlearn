// CatalogGrid.jsx — lesson catalog cards with 3 states

const LESSONS = [
  { id: 'DEV-042', cat: 'dev', cat_label: 'DEV', diff: 'intermediate', diff_label: 'INTERMÉDIAIRE', title: 'Injection SQL — détection & exploit', desc: "Apprends à repérer les endpoints vulnérables et à extraire des données via UNION/boolean blind.", xp: 240, dur: '28 min', state: 'default' },
  { id: 'CYB-017', cat: 'cyber', cat_label: 'CYBERSEC', diff: 'beginner', diff_label: 'DÉBUTANT', title: 'Reconnaissance réseau avec nmap', desc: "Scan de ports, fingerprinting OS et détection de services — les premières étapes d'un pentest.", xp: 180, dur: '22 min', state: 'in-progress', progress: { done: 3, total: 5, pct: 60 } },
  { id: 'NET-009', cat: 'net', cat_label: 'RÉSEAU', diff: 'beginner', diff_label: 'DÉBUTANT', title: 'Modèle OSI — les 7 couches', desc: "Comprendre la pile OSI du physique à l'applicatif. Exemples concrets, captures Wireshark.", xp: 150, dur: '18 min', state: 'completed' },

  { id: 'CYB-023', cat: 'cyber', cat_label: 'CYBERSEC', diff: 'advanced', diff_label: 'AVANCÉ', title: 'Buffer overflow — exploit x86', desc: "Écraser EIP, shellcode, bypass ASLR. Un classique qui reste au programme de tous les CTF.", xp: 420, dur: '52 min', state: 'default' },
  { id: 'DEV-018', cat: 'dev', cat_label: 'DEV', diff: 'intermediate', diff_label: 'INTERMÉDIAIRE', title: 'Auth JWT — les pièges courants', desc: "alg:none, secret faible, tokens non expirés. Panorama des failles et comment les corriger.", xp: 220, dur: '26 min', state: 'in-progress', progress: { done: 2, total: 4, pct: 50 } },
  { id: 'NET-014', cat: 'net', cat_label: 'RÉSEAU', diff: 'intermediate', diff_label: 'INTERMÉDIAIRE', title: 'TLS 1.3 — handshake et ciphers', desc: "Comprendre le nouveau handshake en 1-RTT, PSK, 0-RTT. Pourquoi TLS 1.2 n'est plus suffisant.", xp: 260, dur: '32 min', state: 'default' },

  { id: 'CYB-031', cat: 'cyber', cat_label: 'CYBERSEC', diff: 'intermediate', diff_label: 'INTERMÉDIAIRE', title: 'XSS — stored, reflected, DOM', desc: "Trois variantes d'injection de script, impacts réels et stratégies de défense côté serveur.", xp: 200, dur: '24 min', state: 'completed' },
  { id: 'DEV-056', cat: 'dev', cat_label: 'DEV', diff: 'beginner', diff_label: 'DÉBUTANT', title: 'Git — branches et pull requests', desc: "Workflow de base, rebase vs merge, revues de code. Les bases propres que tout dev devrait maîtriser.", xp: 120, dur: '15 min', state: 'default' },
  { id: 'NET-021', cat: 'net', cat_label: 'RÉSEAU', diff: 'advanced', diff_label: 'AVANCÉ', title: 'BGP hijacking — cas réels', desc: "Incidents historiques, mécaniques d'attaque et défenses RPKI. Pour qui veut comprendre l'Internet.", xp: 380, dur: '45 min', state: 'default' },
];

const CategoryIcon = ({ cat }) => {
  const s = { width: 64, height: 64, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (cat) {
    case 'dev':
      return (<svg viewBox="0 0 64 64" {...s}><path d="M22 20 L8 32 L22 44"/><path d="M42 20 L56 32 L42 44"/><path d="M36 14 L28 50"/></svg>);
    case 'cyber':
      return (<svg viewBox="0 0 64 64" {...s}><path d="M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z"/><path d="M24 32 L30 38 L42 24"/></svg>);
    case 'net':
      return (<svg viewBox="0 0 64 64" {...s}><circle cx="32" cy="14" r="4"/><circle cx="14" cy="48" r="4"/><circle cx="50" cy="48" r="4"/><path d="M32 18 L14 44 M32 18 L50 44 M18 48 L46 48"/></svg>);
    default: return null;
  }
};

const DiffBars = ({ diff }) => {
  const count = diff === 'beginner' ? 1 : diff === 'intermediate' ? 2 : 3;
  return (
    <span className="card__diff-bars">
      {[1,2,3].map(i => (<span key={i} className={`card__diff-bar ${i <= count ? 'is-on' : ''}`} />))}
    </span>
  );
};

const StatusIcon = ({ state }) => {
  const s = { width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (state === 'completed') return (<svg viewBox="0 0 16 16" {...s}><path d="M3 8 L7 12 L13 4"/></svg>);
  if (state === 'in-progress') return (<svg viewBox="0 0 16 16" {...s}><circle cx="8" cy="8" r="6"/><path d="M8 4 V8 L11 10"/></svg>);
  return (<svg viewBox="0 0 16 16" {...s}><path d="M4 3 V13 L12 8 Z"/></svg>);
};

function LessonCard({ l }) {
  const stateClass = l.state === 'in-progress' ? 'card--in-progress' : l.state === 'completed' ? 'card--completed' : '';
  const statusLabel = l.state === 'completed' ? 'TERMINÉ' : l.state === 'in-progress' ? 'EN COURS' : 'COMMENCER';
  return (
    <article className={`card card--${l.cat} ${stateClass}`}>
      {l.state === 'completed' && (
        <div className="card__check">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 L7 12 L13 4"/></svg>
        </div>
      )}
      <div className="card__head">
        <span className={`card__tag card__tag--${l.cat}`}>{l.cat_label}</span>
        <span className={`card__diff card__diff--${l.diff}`}>
          <DiffBars diff={l.diff} />
          <span>{l.diff_label}</span>
        </span>
      </div>
      <div className="card__cover">
        <span className="card__cover-label">// {l.cat_label}</span>
        <span className="card__cover-id">{l.id}</span>
        <div className="card__icon"><CategoryIcon cat={l.cat} /></div>
      </div>
      <div className="card__body">
        <h3 className="card__title">{l.title}</h3>
        <p className="card__desc">{l.desc}</p>
      </div>
      {l.state === 'in-progress' && (
        <div className="card__progress">
          <div className="card__progress-head">
            <span><b>{l.progress.done}/{l.progress.total}</b> SECTIONS</span>
            <span>{l.progress.pct}%</span>
          </div>
          <div className="card__progress-bar">
            <div className="card__progress-fill" style={{ width: `${l.progress.pct}%` }} />
          </div>
        </div>
      )}
      <div className="card__foot">
        <span className="card__xp">+{l.xp} XP</span>
        <span className="card__dur">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4 V8 L11 10"/></svg>
          {l.dur}
        </span>
        <span className="card__status"><StatusIcon state={l.state} /> {statusLabel}</span>
      </div>
    </article>
  );
}

function CatalogHeader() {
  return (
    <>
      <div className="cat-breadcrumb">
        <span className="p">$</span> <span>~/</span><b>cyberlearn</b><span className="slash">/</span><span className="current">leçons</span><span className="caret"/>
      </div>
      <header className="cat-head">
        <div>
          <h1 className="cat-title">142 <em>missions</em><br/>disponibles</h1>
          <p className="cat-sub">Filtre par domaine, niveau ou statut. Chaque leçon te fait progresser dans ton parcours et alimente ton XP.</p>
        </div>
        <div className="cat-meta">
          <div className="cat-meta__row">
            <span><b>142</b> total</span>
            <span className="cat-meta__sep">/</span>
            <span><b>12</b> en cours</span>
            <span className="cat-meta__sep">/</span>
            <span><b>34</b> terminées</span>
          </div>
          <div className="cat-meta__row">
            <span>TRIER · RÉCENTES</span>
            <span className="cat-meta__sep">/</span>
            <span>VUE · GRILLE</span>
          </div>
        </div>
      </header>
    </>
  );
}

function CatalogFilters() {
  const [cat, setCat] = React.useState('all');
  const cats = [
    { id: 'all', label: 'TOUS', count: 142, dot: 'all' },
    { id: 'dev', label: 'DEV', count: 58, dot: 'dev' },
    { id: 'cyber', label: 'CYBERSEC', count: 61, dot: 'cyber' },
    { id: 'net', label: 'RÉSEAU', count: 23, dot: 'net' },
  ];
  return (
    <div className="filters">
      <div className="pill-row">
        <span className="pill-row__label">› DOMAINE</span>
        {cats.map(c => (
          <button
            key={c.id}
            className={`t-pill ${cat === c.id ? 'is-active' : ''}`}
            onClick={() => setCat(c.id)}
          >
            <span className={`t-pill__dot t-pill__dot--${c.dot}`}/>
            <span>{c.label}</span>
            <span className="t-pill__count">{c.count}</span>
          </button>
        ))}
      </div>
      <select className="sel" defaultValue="all-diff">
        <option value="all-diff">NIVEAU · TOUS</option>
        <option>DÉBUTANT</option>
        <option>INTERMÉDIAIRE</option>
        <option>AVANCÉ</option>
      </select>
      <select className="sel" defaultValue="all-status">
        <option value="all-status">STATUT · TOUS</option>
        <option>NON COMMENCÉS</option>
        <option>EN COURS</option>
        <option>TERMINÉS</option>
      </select>
      <label className="search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input type="text" placeholder="/ rechercher une leçon..." />
      </label>
    </div>
  );
}

function CatalogFoot() {
  return (
    <div className="cat-foot">
      <span>Affichage <b>1–9</b> sur <b>142</b></span>
      <div className="actions">
        <button className="btn-page">← PRÉC</button>
        <button className="btn-page is-current">01</button>
        <button className="btn-page">02</button>
        <button className="btn-page">03</button>
        <span style={{padding: '0 6px', color: 'var(--fg-disabled)'}}>…</span>
        <button className="btn-page">16</button>
        <button className="btn-page">SUIV →</button>
      </div>
    </div>
  );
}

function Catalog() {
  return (
    <main className="main">
      <div className="catalog">
        <CatalogHeader />
        <CatalogFilters />
        <div className="grid">
          {LESSONS.map(l => <LessonCard key={l.id} l={l} />)}
        </div>
        <CatalogFoot />
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <Catalog />
    </div>
  );
}

window.CatalogApp = App;
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
