// PathsCatalog.jsx — Cyber Learn paths catalog page

const PATHS = [
  {
    id: 'CYL-PATH-001', kind: 'cyber', cat: 'CYBERSEC', diff: 'int', diffLabel: 'Intermédiaire',
    title: 'Pentester Web — de zéro à CTF',
    desc: "Mappe, fuzz, exploite. Du premier scan aux exfiltrations finales — 24 missions guidées dans un sandbox isolé.",
    missions: 24, hours: '~18h', xp: '1 800', cert: true,
    state: 'inprog', progress: { done: 8, total: 24 },
  },
  {
    id: 'CYL-PATH-002', kind: 'dev', cat: 'DEV', diff: 'int', diffLabel: 'Intermédiaire',
    title: 'Sécurité applicative — OWASP Top 10',
    desc: "Auth, sessions, JWT, injections. Apprends à écrire du code qui ne se fait pas pwn par un junior avec curl.",
    missions: 18, hours: '~14h', xp: '1 400', cert: true,
    state: 'done', progress: { done: 18, total: 18 },
  },
  {
    id: 'CYL-PATH-003', kind: 'net', cat: 'RÉSEAU', diff: 'beg', diffLabel: 'Débutant',
    title: 'Réseaux & TLS — comprendre le câble',
    desc: "OSI, TCP/IP, captures Wireshark, handshake TLS 1.3. Décrypte ce qui circule entre ton client et le serveur.",
    missions: 16, hours: '~12h', xp: '1 200', cert: true,
    state: 'inprog', progress: { done: 4, total: 16 },
  },
  {
    id: 'CYL-PATH-004', kind: 'cyber', cat: 'CYBERSEC', diff: 'beg', diffLabel: 'Débutant',
    title: 'Fondamentaux Cybersécurité',
    desc: "Modèle de menace, cryptographie de base, hygiène numérique. Le socle commun avant de spécialiser.",
    missions: 14, hours: '~10h', xp: '1 000', cert: true,
    state: 'idle', progress: { done: 0, total: 14 },
  },
  {
    id: 'CYL-PATH-005', kind: 'dev', cat: 'DEV', diff: 'adv', diffLabel: 'Avancé',
    title: 'Reverse Engineering — Binaires Linux',
    desc: "Désassemble, comprends et exploite. Du buffer overflow x86 au ROP, dans un VM safe.",
    missions: 20, hours: '~22h', xp: '2 400', cert: true,
    state: 'idle', progress: { done: 0, total: 20 },
  },
  {
    id: 'CYL-PATH-006', kind: 'net', cat: 'RÉSEAU', diff: 'int', diffLabel: 'Intermédiaire',
    title: 'Sécurité réseau & pare-feux',
    desc: "Segmentation, ACL, IDS/IPS, VPN. Construis et défends une infra réaliste de PME.",
    missions: 16, hours: '~14h', xp: '1 600', cert: false,
    state: 'idle', progress: { done: 0, total: 16 },
  },
];

function PathBreadcrumb() {
  return (
    <div className="pcat-crumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span className="current">parcours</span>
      <span className="caret" />
    </div>
  );
}

function Header() {
  const inprog = PATHS.filter(p => p.state === 'inprog').length;
  const done = PATHS.filter(p => p.state === 'done').length;
  return (
    <header className="pcat-head">
      <div>
        <h1 className="pcat-title"><em>12</em> parcours disponibles</h1>
        <p className="pcat-sub">Chaque parcours mène d'une compétence brute à un certificat vérifiable.</p>
      </div>
      <div className="pcat-meta">
        <div className="pcat-meta__row">
          <span><b className="ip">{inprog}</b> en cours</span>
          <span className="pcat-meta__sep">/</span>
          <span><b className="cp">{done}</b> certifié</span>
          <span className="pcat-meta__sep">/</span>
          <span><b>{12 - inprog - done}</b> à découvrir</span>
        </div>
        <div className="pcat-meta__row">
          <span>+ <b>248</b> heures de contenu · <b>14 800</b> XP total</span>
        </div>
      </div>
    </header>
  );
}

function Filters({ category, setCategory }) {
  const pills = [
    { id: 'all', label: 'Tous', cls: 'all' },
    { id: 'cyber', label: 'Cybersec', cls: 'cyber' },
    { id: 'dev', label: 'Dev', cls: 'dev' },
    { id: 'net', label: 'Réseau', cls: 'net' },
  ];
  return (
    <div className="pcat-filters">
      <span className="pcat-filters__label">› DOMAINE</span>
      <div className="pcat-filters__group">
        {pills.map(p => (
          <button
            key={p.id}
            className={`cat-pill cat-pill--${p.cls} ${category === p.id ? 'is-active' : ''}`}
            onClick={() => setCategory(p.id)}
          >
            <span className="cat-pill__dot" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      <span className="pcat-filters__sep" />
      <button className="pcat-select"><span className="pcat-select__lbl">DIFF</span> Tous niveaux</button>
      <button className="pcat-select"><span className="pcat-select__lbl">STATUT</span> Tous</button>
      <label className="pcat-search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input type="text" placeholder="/ chercher un parcours..." />
      </label>
    </div>
  );
}

const KindIcon = ({ kind, size = 64 }) => {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'cyber') return (<svg viewBox="0 0 64 64" {...s}><path d="M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z"/><path d="M24 32 L30 38 L42 24"/></svg>);
  if (kind === 'dev')   return (<svg viewBox="0 0 64 64" {...s}><path d="M22 20 L8 32 L22 44"/><path d="M42 20 L56 32 L42 44"/><path d="M36 14 L28 50"/></svg>);
  return (<svg viewBox="0 0 64 64" {...s}><circle cx="32" cy="14" r="4"/><circle cx="14" cy="48" r="4"/><circle cx="50" cy="48" r="4"/><path d="M32 18 L14 44 M32 18 L50 44 M18 48 L46 48"/></svg>);
};

const DiffBars = ({ level }) => {
  const count = level === 'beg' ? 1 : level === 'int' ? 2 : 3;
  return (
    <span className="pc__diff-bars">
      {[1,2,3].map(i => <span key={i} className={`pc__diff-bar ${i <= count ? 'is-on' : ''}`} />)}
    </span>
  );
};

function PathCard({ p }) {
  const pct = (p.progress.done / p.progress.total) * 100;
  return (
    <article className={`pc pc--${p.kind} pc--${p.state}`}>
      <div className="pc__cover">
        <span className="pc__noise" />
        <span className="pc__cat">{p.cat}</span>
        {p.state === 'done' ? (
          <span className="pc__cert-badge">
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 L7 12 L13 4"/></svg>
            Certifié
          </span>
        ) : (
          <span className={`pc__diff pc__diff--${p.diff}`}>
            <DiffBars level={p.diff} />
            {p.diffLabel}
          </span>
        )}
        <div className="pc__icon"><KindIcon kind={p.kind} size={70} /></div>
        <span className="pc__id">// <b>{p.id}</b></span>
        {p.cert && (
          <span className="pc__cert">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="6" r="3"/><path d="M5.5 8.5 L4.5 14 L8 12 L11.5 14 L10.5 8.5"/></svg>
            Certificat
          </span>
        )}
      </div>
      <div className="pc__body">
        <h3 className="pc__title">{p.title}</h3>
        <p className="pc__desc">{p.desc}</p>
        <div className="pc__stats">
          <span><b>{p.missions}</b> missions</span>
          <span className="sep">·</span>
          <span><b>{p.hours}</b></span>
          <span className="sep">·</span>
          <span className="xp">+{p.xp} XP</span>
        </div>
        <div className="pc__prog-wrap">
          <div className="pc__prog-head">
            <span>
              {p.state === 'idle' && <>Non commencé</>}
              {p.state === 'inprog' && <><b>{p.progress.done}</b> / {p.progress.total} missions</>}
              {p.state === 'done' && <><b>Parcours complété</b></>}
            </span>
            <span className="pct">{Math.round(pct)}%</span>
          </div>
          <div className="pc__prog-bar">
            <div className="pc__prog-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="pc__foot">
        {p.state === 'done' ? (
          <a href="#" className="pc-btn pc-btn--done">
            Voir le certificat
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
          </a>
        ) : (
          <a href="#" className="pc-btn pc-btn--primary">
            {p.state === 'inprog' ? 'Continuer' : 'Commencer'}
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
          </a>
        )}
        <a href="#" className="pc-btn">Aperçu</a>
      </div>
    </article>
  );
}

function Catalog() {
  const [category, setCategory] = React.useState('all');
  const filtered = category === 'all' ? PATHS : PATHS.filter(p => p.kind === category);
  return (
    <main className="main">
      <div className="pcat">
        <PathBreadcrumb />
        <Header />
        <Filters category={category} setCategory={setCategory} />
        <div className="pcat-grid">
          {filtered.map(p => <PathCard key={p.id} p={p} />)}
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
      <Catalog />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
